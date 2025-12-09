import { useState } from 'react';
import BPBCalculator from './components/BPBCalculator';
import Home from './components/Home';
import Resume from './components/Resume';
import Gallery from './components/Gallery';
import './tab-bar.css'; // Will create this next

function App() {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Home />;
      case 'resume': return <Resume />;
      case 'gallery': return <Gallery />;
      case 'bpb': return <BPBCalculator />;
      default: return <Home />;
    }
  };

  return (
    <div className="app-layout">
      <main className="content-area">
        {renderContent()}
      </main>

      <nav className="tab-bar">
        <button
          className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="icon">🏠</span>
          <span className="label">Home</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'resume' ? 'active' : ''}`}
          onClick={() => setActiveTab('resume')}
        >
          <span className="icon">📄</span>
          <span className="label">Resume</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'gallery' ? 'active' : ''}`}
          onClick={() => setActiveTab('gallery')}
        >
          <span className="icon">🖼️</span>
          <span className="label">Photos</span>
        </button>
        <button
          className={`tab-item ${activeTab === 'bpb' ? 'active' : ''}`}
          onClick={() => setActiveTab('bpb')}
        >
          <span className="icon">🍺</span>
          <span className="label">BPB</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
