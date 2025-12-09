const Home = () => {
    return (
        <div style={{ padding: '20px', textAlign: 'center', marginTop: '40px' }}>
            <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF9500, #FF2D55)',
                margin: '0 auto 20px auto'
            }}></div>
            <h1>Welcome to Sweeney Town</h1>
            <p style={{ marginTop: '10px' }}>The personal portfolio of Sweeney.</p>

            <div className="ios-card" style={{ marginTop: '30px', padding: '20px', textAlign: 'left' }}>
                <h2>About Me</h2>
                <p style={{ marginTop: '10px' }}>
                    I build cool things. This entire website acts like an app.
                    Check out my work in the tabs below.
                </p>
            </div>
        </div>
    );
};

export default Home;
