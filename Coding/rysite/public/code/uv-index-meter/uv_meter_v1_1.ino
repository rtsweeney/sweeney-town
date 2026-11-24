/**************************************************************************
  BEACH UV INDEX METER — v1.1 
  Hardware: Adafruit ESP32 Feather V2 (#5400)
            2.13" Tri-Color eInk FeatherWing SSD1680 RW (#4814), stacked
            Adafruit AS7331 (#6476) via STEMMA QT
            2500mAh LiPo, IP67 button on pin 27 <-> GND

  WHAT'S NEW vs v1.0:
    - Silent sensor sample every 30s; display refresh every 5 min (10th wake)
    - Median-of-5 filtering (beach blankets, hands, seagulls: rejected)
    - 3 screens: aviators / channels+records / chart+dose+SED
    - Short press (<1.5s) = next screen (refreshes immediately)
      Long press (>=1.5s) = power on/off
    - All-time channel records in flash (survive battery death)
    - Low-battery cutoff at 3.5V with "charge me" screen
    - Battery % icon, relative time axis, dose integral, SED

  FLASHING (recap from v1.0 header):
    Arduino IDE -> board "Adafruit Feather ESP32 V2" (esp32 core installed)
    Libraries: "Adafruit AS7331", "Adafruit EPD" (+ dependencies)
    Put this file in a folder named  uv_meter_v1_1/  then open & Upload.
**************************************************************************/

#include <Adafruit_AS7331.h>
#include <Adafruit_ThinkInk.h>
#include <Preferences.h>
#include <driver/rtc_io.h>   // keeps the button pullup alive in deep sleep

// ------------------------------ SETTINGS ----------------------------------
#define SAMPLE_SECONDS   30     // silent sensor sample interval
#define REFRESH_EVERY    10     // display refresh every Nth sample (5 min)
#define CHART_SLOT_SECONDS (REFRESH_EVERY * SAMPLE_SECONDS) // real seconds/chart slot
#define K_B              0.025f // UVI = K_B*UVB + K_A*UVA  (calibrate me!)
#define K_A              0.0004f
#define VBAT_CUTOFF      3.50f  // volts: below this -> charge-me mode
#define LONG_PRESS_MS    1500
#define MIN_SAVE_DOSE    0.05f  // don't log sessions shorter than a blip
#define CHART_SLOTS      78     // 78 x 5 min = 6.5 h of chart

// ------------------------------ PINS --------------------------------------
#define EPD_DC    33
#define EPD_CS    15
#define SRAM_CS   32
#define EPD_RESET -1
#define EPD_BUSY  -1
#define BUTTON_PIN GPIO_NUM_27   // external IP67 button: pin 27 <-> GND
#define VBAT_PIN   35

// Panel batches differ! If you see a bar of static at the top or bottom,
// swap which of these two lines is commented out:
ThinkInk_213_Tricolor_MFGNR display(EPD_DC, EPD_RESET, EPD_CS, SRAM_CS, EPD_BUSY);
//ThinkInk_213_Tricolor_RW display(EPD_DC, EPD_RESET, EPD_CS, SRAM_CS, EPD_BUSY);
Adafruit_AS7331 as7331;
Preferences prefs;

// --------------------- STATE THAT SURVIVES DEEP SLEEP ---------------------
RTC_DATA_ATTR bool     deviceOn      = true;
RTC_DATA_ATTR bool     lowBattShown  = false;
RTC_DATA_ATTR uint32_t wakeCount     = 0;
RTC_DATA_ATTR uint8_t  screenIdx     = 0;       // 0 aviators, 1 channels, 2 chart
RTC_DATA_ATTR float    samples[5]    = {0};     // 30s ring for median
RTC_DATA_ATTR uint8_t  sampleCount   = 0;
RTC_DATA_ATTR uint8_t  sampleHead    = 0;
RTC_DATA_ATTR float    lastUVA = 0, lastUVB = 0, lastUVC = 0;
RTC_DATA_ATTR float    doseUVIh      = 0;       // trapezoid-free running sum
RTC_DATA_ATTR uint8_t  chart[CHART_SLOTS] = {0};// UVI*10, capped 255
RTC_DATA_ATTR uint8_t  chartCount    = 0;

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(50);
  wakeCount++;

  float vbat = readBattery();
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  bool wantRefresh = false;

  // ---------- Button: any press wakes from OFF; long press powers off ----
  if (cause == ESP_SLEEP_WAKEUP_EXT0) {
    uint32_t held = measureHold();
    if (!deviceOn) {                           // any press = tan again!
      deviceOn = true;
      resetSession();
      wantRefresh = true;
      Serial.println("Button: new session started");
    } else if (held >= LONG_PRESS_MS) {        // long press = end session
      saveSession();
      deviceOn = false;
      Serial.println("Long press: session saved, OFF");
      drawSummaryScreen();
      goToSleep(false);
    } else {
      screenIdx = (screenIdx + 1) % 3;
      wantRefresh = true;
      Serial.printf("Short press: screen %u\n", screenIdx);
    }
  }

  // ---------- Fresh power-on (USB plug, reset button) ----------
  if (cause != ESP_SLEEP_WAKEUP_EXT0 && cause != ESP_SLEEP_WAKEUP_TIMER) {
    resetSession();
    deviceOn   = true;
    wantRefresh = true;
    Serial.println("Cold boot: new session.");
  }

  if (!deviceOn) goToSleep(false);   // OFF: screen already shows it, just sleep

  // ---------- Low battery guard (before any expensive work) ----------
  if (vbat < VBAT_CUTOFF) {
    if (!lowBattShown) { saveSession(); drawChargeScreen(); lowBattShown = true; }
    Serial.printf("Battery %.2fV: charge-me mode\n", vbat);
    goToSleep(false);
  }
  if (vbat > VBAT_CUTOFF + 0.10f) lowBattShown = false;  // hysteresis

  // ---------- Take a sample (every wake, ~1 second of work) ----------
  if (readSensor()) {
    float uvi = K_B * lastUVB + K_A * lastUVA;
    if (uvi < 0) uvi = 0;
    samples[sampleHead] = uvi;
    sampleHead = (sampleHead + 1) % 5;
    if (sampleCount < 5) sampleCount++;

    float uviMed = medianUVI();
    doseUVIh += uviMed * SAMPLE_SECONDS / 3600.0f;
    updateRecords();

    if (wakeCount % REFRESH_EVERY == 0) pushChartPoint(uviMed);
    Serial.printf("UVI %.2f (median %.2f) dose %.2f batt %.2fV\n",
                  uvi, uviMed, doseUVIh, vbat);
  } else {
    Serial.println("Sensor read failed; keeping last median.");
  }

  // ---------- Refresh display only when due ----------
  if (wakeCount % REFRESH_EVERY == 0) wantRefresh = true;
  if (wantRefresh) drawScreen(vbat);

  goToSleep(true);
}

void loop() {}

// =========================== SENSOR & DATA ================================
bool readSensor() {
#if defined(NEOPIXEL_I2C_POWER)
  pinMode(NEOPIXEL_I2C_POWER, OUTPUT);
  digitalWrite(NEOPIXEL_I2C_POWER, HIGH);     // V2: switched QT power rail
#endif
  delay(30);
  if (!as7331.begin()) return false;
  as7331.powerDown(true);
  as7331.setGain(AS7331_GAIN_8X);             // beach-sun setting
  as7331.setIntegrationTime(AS7331_TIME_64MS);
  as7331.setMeasurementMode(AS7331_MODE_CONT);
  as7331.setClockFrequency(AS7331_CLOCK_1024MHZ);
  as7331.setStandby(false);
  as7331.powerDown(false);
  delay(250);

  bool ok = false;
  for (int i = 0; i < 5 && !ok; i++) {
    ok = as7331.readAllUV_uWcm2(&lastUVA, &lastUVB, &lastUVC);
    if (!ok) delay(80);
  }
  if (as7331.hasOverflow()) ok = false;       // saturated reading = garbage
  as7331.powerDown(true);
  return ok;
}

float medianUVI() {
  if (sampleCount == 0) return 0;
  float s[5];
  uint8_t n = sampleCount;
  for (uint8_t i = 0; i < n; i++) s[i] = samples[i];
  for (uint8_t i = 1; i < n; i++)             // insertion sort, n<=5
    for (uint8_t j = i; j > 0 && s[j] < s[j-1]; j--)
      { float t = s[j]; s[j] = s[j-1]; s[j-1] = t; }
  return s[n / 2];
}

void pushChartPoint(float uvi) {
  uint8_t v = (uint8_t)min(uvi * 10.0f, 255.0f);
  if (chartCount < CHART_SLOTS) chart[chartCount++] = v;
  else {                                       // >6.5h: slide the window
    memmove(chart, chart + 1, CHART_SLOTS - 1);
    chart[CHART_SLOTS - 1] = v;
  }
}

void updateRecords() {                         // flash-friendly: write on record only
  prefs.begin("uvmeter", false);
  if (lastUVA > prefs.getFloat("maxA", 5000)) prefs.putFloat("maxA", lastUVA);
  if (lastUVB > prefs.getFloat("maxB", 250))  prefs.putFloat("maxB", lastUVB);
  if (lastUVC > prefs.getFloat("maxC", 10))   prefs.putFloat("maxC", lastUVC);
  prefs.end();
}

float readBattery() { return analogReadMilliVolts(VBAT_PIN) * 2.0f / 1000.0f; }

int batteryPct(float v) {
  int p = (int)((v - VBAT_CUTOFF) / (4.20f - VBAT_CUTOFF) * 100.0f);
  return constrain(p, 0, 100);
}

void resetSession() {
  sampleCount = sampleHead = chartCount = 0;
  doseUVIh = 0;  wakeCount = 0;  screenIdx = 0;
}

uint32_t measureHold() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);           // GPIO 27 has internal pullup
  uint32_t t0 = millis();
  while (digitalRead(BUTTON_PIN) == LOW && millis() - t0 < 4000) delay(10);
  return millis() - t0;
}

// ============================== DRAWING ====================================
void drawScreen(float vbat) {
  display.begin(THINKINK_TRICOLOR);
  display.clearBuffer();
  display.setTextWrap(false);
  float uvi = medianUVI();

  if      (screenIdx == 0) drawAviators(uvi, vbat);
  else if (screenIdx == 1) drawChannels();
  else                     drawChart();

  drawPageDots();
  uint32_t t0 = millis();
  display.display();                           // ~15s tricolor refresh
  Serial.printf("display.display() took %lu ms\n", millis() - t0);
}

// ---------- Screen 1: giant aviators ----------
void drawAviators(float uvi, float vbat) {
  bool gray = (uvi > 3.0f);
  uint16_t digitCol = (uvi >= 8.0f) ? EPD_RED : EPD_BLACK;

  drawLens(22, 30, 92, 62, false, gray);
  drawLens(136, 30, 92, 62, true,  gray);
  display.fillRect(114, 40, 22, 4, EPD_BLACK); // double bridge
  display.fillRect(114, 50, 22, 3, EPD_BLACK);

  // One digit per lens, decimal dot on the bridge
  int d1, d2; bool showDot;
  if (uvi < 10) { d1 = (int)uvi; d2 = (int)(uvi * 10) % 10; showDot = true; }
  else          { int u = min((int)(uvi + 0.5f), 19);
                  d1 = u / 10; d2 = u % 10; showDot = false; }
  display.setTextSize(6);
  display.setTextColor(digitCol);
  display.setCursor(50, 38);  display.print(d1);
  display.setCursor(164, 38); display.print(d2);
  if (showDot) display.fillCircle(125, 86, 4, digitCol);

  // Battery outline with % inside, top-left
  display.drawRect(4, 4, 32, 13, EPD_BLACK);
  display.fillRect(36, 7, 3, 7, EPD_BLACK);
  display.setTextSize(1);
  display.setTextColor(EPD_BLACK);
  display.setCursor(8, 7);
  display.printf("%d%%", batteryPct(vbat));

  if (uvi >= 3.0f) {                           // hearts join the party at 3+
    drawHeart(12, 104, 9);
    drawHeart(238, 104, 9);
    if (uvi >= 9.0f) {                         // and catch fire at 9+
      drawFlames(12, 96);
      drawFlames(238, 96);
    }
  }
}

// Teardrop aviator lens drawn scanline-by-scanline.
// Frame stays black always; inside is clear, or 25% dither for "gray".
void drawLens(int x, int y, int w, int h, bool flip, bool gray) {
  lensShape(x, y, w, h, flip, EPD_BLACK, 0);             // solid frame
  lensShape(x + 3, y + 3, w - 6, h - 6, flip, EPD_WHITE, 0); // carve interior
  if (gray) lensShape(x + 3, y + 3, w - 6, h - 6, flip, EPD_BLACK, 1);
}

void lensShape(int x, int y, int w, int h, bool flip, uint16_t color, uint8_t mode) {
  float r = h * 0.24f;
  for (int j = 0; j < h; j++) {
    float t = (float)j / (h - 1);
    float inset = (j < r) ? r - sqrtf(r * r - (r - j) * (r - j)) : 0;
    float taper = 0, lean = t * t * (w * 0.10f);
    if (t > 0.45f) { float u = (t - 0.45f) / 0.55f; taper = powf(u, 1.7f) * (w * 0.55f); }
    float L = flip ? x + inset + taper : x + inset + lean;
    float R = flip ? x + w - inset - lean : x + w - inset - taper;
    if (R - L < 1) continue;
    if (mode == 0) display.drawFastHLine((int)L, y + j, (int)(R - L), color);
    else for (int px = (int)L; px < (int)R; px++)
           if (px % 2 == 0 && (y + j) % 2 == 0) display.drawPixel(px, y + j, color);
  }
}

void drawHeart(int cx, int cy, int s) {
  display.fillCircle(cx - s / 3, cy, s / 3 + 1, EPD_RED);
  display.fillCircle(cx + s / 3, cy, s / 3 + 1, EPD_RED);
  display.fillTriangle(cx - s * 2 / 3 - 1, cy + 1, cx + s * 2 / 3 + 1, cy + 1,
                       cx, cy + s, EPD_RED);
}

void drawFlames(int cx, int cy) {
  display.fillTriangle(cx - 6, cy, cx - 3, cy - 9, cx, cy, EPD_RED);
  display.fillTriangle(cx - 1, cy, cx + 3, cy - 12, cx + 6, cy, EPD_RED);
}

// ---------- Screen 2: channels with all-time records as bar scale ----------
void drawChannels() {
  prefs.begin("uvmeter", true);
  float maxA = prefs.getFloat("maxA", 5000);
  float maxB = prefs.getFloat("maxB", 250);
  float maxC = prefs.getFloat("maxC", 10);
  prefs.end();

  display.setTextSize(1);
  display.setTextColor(EPD_BLACK);
  display.setCursor(4, 4);   display.print("uv channels (uW/cm2)");
  display.setCursor(222, 4); display.print("best");

  channelRow(28,  "UVA", lastUVA, maxA, EPD_BLACK);
  channelRow(58,  "UVB", lastUVB, maxB, EPD_RED);   // the tanning band
  channelRow(88,  "UVC", lastUVC, maxC, EPD_BLACK);
}

void channelRow(int y, const char* name, float val, float vmax, uint16_t col) {
  display.setTextSize(2);
  display.setTextColor(col);
  display.setCursor(4, y); display.print(name);

  char buf[8]; snprintf(buf, sizeof(buf), "%.0f", val);
  display.setCursor(100 - strlen(buf) * 12, y); display.print(buf);

  display.drawRect(106, y + 1, 96, 13, EPD_BLACK);
  int fillW = (vmax > 0) ? (int)(min(val / vmax, 1.0f) * 92) : 0;
  if (fillW > 0) display.fillRect(108, y + 3, fillW, 9, col);

  display.setTextSize(1);
  display.setTextColor(EPD_BLACK);
  display.setCursor(206, y + 4); display.printf("%.0f", vmax);
}

// Formats a duration as "+Nm" under an hour, else "+Nh" / "+N.Nh".
void formatElapsed(char* buf, size_t n, uint32_t totalSeconds) {
  uint32_t mins = totalSeconds / 60;
  if (mins < 60) {
    snprintf(buf, n, "+%um", mins);
  } else {
    float hrs = mins / 60.0f;
    if (fabsf(hrs - roundf(hrs)) < 0.05f) snprintf(buf, n, "+%dh", (int)roundf(hrs));
    else                                  snprintf(buf, n, "+%.1fh", hrs);
  }
}

// ---------- Screen 3: UVI since power-on + dose + SED ----------
void drawChart() {
  display.setTextSize(1);
  display.setTextColor(EPD_BLACK);
  display.setCursor(4, 4); display.print("uv index");

  char sed[16]; snprintf(sed, sizeof(sed), "SED: %.1f", doseUVIh * 0.9f);
  display.setCursor(246 - strlen(sed) * 6, 4); display.print(sed);

  const int x0 = 24, x1 = 240, y0 = 100, y1 = 22;     // plot box
  display.drawFastHLine(x0, y0, x1 - x0, EPD_BLACK);
  display.drawFastVLine(x0, y1, y0 - y1, EPD_BLACK);

  int y7 = y0 - (int)(7.0f / 12.0f * (y0 - y1));      // dashed red UVI-7 line
  for (int x = x0; x < x1; x += 8) display.drawFastHLine(x, y7, 4, EPD_RED);
  display.setTextColor(EPD_RED);
  display.setCursor(12, y7 - 3); display.print("7");

  // Line always stretches start->now across the full plot width, so the
  // x-axis auto-scales to whatever the session's actual span is (it caps
  // once the ring buffer fills at CHART_SLOTS * CHART_SLOT_SECONDS).
  // CHART_SLOTS (78) stays well under the plot's 216px width, so every
  // slot still gets its own pixel column -- no overlapping points even
  // with a full buffer.
  uint8_t steps = (chartCount > 1) ? chartCount - 1 : 1;
  float dx = (float)(x1 - x0) / steps;
  int px = -1, py = -1;
  for (int i = 0; i < chartCount; i++) {
    float uvi = chart[i] / 10.0f;
    int cx = x0 + (int)(i * dx);
    int cy = y0 - (int)(min(uvi, 12.0f) / 12.0f * (y0 - y1));
    if (px >= 0) display.drawLine(px, py, cx, cy, EPD_BLACK);
    px = cx; py = cy;
  }
  if (px >= 0) display.fillCircle(px, py, 3, EPD_RED); // "now" dot

  // Ticks/labels: start is always +0h; mid and end reflect the real
  // elapsed time spanned by the chart so far, since each slot is a
  // defined CHART_SLOT_SECONDS wide.
  uint32_t totalSec = (chartCount > 1) ? (uint32_t)(chartCount - 1) * CHART_SLOT_SECONDS : 0;
  int xMid = (x0 + x1) / 2;
  display.drawFastVLine(xMid, y0 + 1, 3, EPD_BLACK);   // midpoint tick
  display.drawFastVLine(x1,   y0 + 1, 3, EPD_BLACK);   // end tick

  char midLbl[8], endLbl[8];
  formatElapsed(midLbl, sizeof(midLbl), totalSec / 2);
  formatElapsed(endLbl, sizeof(endLbl), totalSec);

  display.setTextColor(EPD_BLACK);
  display.setCursor(x0, 104);                             display.print("start");
  display.setCursor(xMid - (int)strlen(midLbl) * 3, 104); display.print(midLbl);
  display.setCursor(x1  - (int)strlen(endLbl) * 6, 104);  display.print(endLbl);
  display.setCursor(4, 114);
  display.printf("sun dose: %.1f uvi-h", doseUVIh);
}

// ---------- Utility screens ----------
void drawPageDots() {
  for (int i = 0; i < 3; i++) {
    if (i == screenIdx) display.fillCircle(226 + i * 10, 116, 2, EPD_BLACK);
    else                display.drawCircle(226 + i * 10, 116, 2, EPD_BLACK);
  }
}

void saveSession() {
  if (doseUVIh < MIN_SAVE_DOSE) return;        // ignore accidental on/offs
  prefs.begin("uvmeter", false);
  float hist[5] = {0};
  prefs.getBytes("hist", hist, sizeof(hist));
  memmove(&hist[1], &hist[0], 4 * sizeof(float));   // shift older sessions
  hist[0] = doseUVIh;                               // hist[0] = newest
  prefs.putBytes("hist", hist, sizeof(hist));
  prefs.end();
}

void drawSummaryScreen() {
  float hist[5] = {0};
  prefs.begin("uvmeter", true);
  prefs.getBytes("hist", hist, sizeof(hist));
  prefs.end();

  display.begin(THINKINK_TRICOLOR);
  display.clearBuffer();
  display.setTextWrap(false);

  display.setTextSize(1);
  display.setTextColor(EPD_BLACK);
  display.setCursor(4, 4);   display.print("last tanning session");
  display.setCursor(168, 4); display.print("last 5");

  display.setTextSize(2);
  display.setCursor(4, 24);  display.printf("%.1f uvi-h", hist[0]);
  display.setTextSize(1);
  display.setCursor(4, 46);  display.printf("SED %.1f", hist[0] * 0.9f);

  // Mini bar chart: oldest left -> newest right, newest in red
  float vmax = 0.1f;
  for (int i = 0; i < 5; i++) if (hist[i] > vmax) vmax = hist[i];
  for (int i = 0; i < 5; i++) {
    float v = hist[4 - i];
    int barH = (int)(v / vmax * 52);
    if (barH > 0)
      display.fillRect(150 + i * 20, 72 - barH, 14, barH,
                       (i == 4) ? EPD_RED : EPD_BLACK);
  }
  display.drawFastHLine(146, 73, 100, EPD_BLACK);

  display.setTextSize(2);
  display.setTextColor(EPD_RED);
  display.setCursor(4, 98); display.print("press to tan again!");
  drawHeart(240, 106, 8);
  display.display();
}

void drawChargeScreen() {
  display.begin(THINKINK_TRICOLOR);
  display.clearBuffer();
  display.drawRect(85, 40, 70, 32, EPD_BLACK);
  display.fillRect(155, 50, 6, 12, EPD_BLACK);
  display.fillRect(89, 44, 14, 24, EPD_RED);
  display.setTextSize(2);
  display.setTextColor(EPD_RED);
  display.setCursor(62, 88); display.print("charge me!");
  display.display();
}

// ============================== SLEEP ======================================
void goToSleep(bool withTimer) {
  rtc_gpio_pullup_en(BUTTON_PIN);      // pullup must live in the RTC domain
  rtc_gpio_pulldown_dis(BUTTON_PIN);   // so it survives deep sleep
  esp_sleep_enable_ext0_wakeup(BUTTON_PIN, 0);
  if (withTimer)
    esp_sleep_enable_timer_wakeup((uint64_t)SAMPLE_SECONDS * 1000000ULL);
  Serial.flush();
  esp_deep_sleep_start();
}
