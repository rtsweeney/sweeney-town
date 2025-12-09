const Resume = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Resume</h1>

            <div className="ios-card" style={{ padding: '20px' }}>
                <h2>Experience</h2>
                <div style={{ marginTop: '15px' }}>
                    <h3 style={{ fontSize: '19px', fontWeight: '600' }}>Senior Developer</h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Tech Corp • 2020 - Present</p>
                    <p style={{ marginTop: '5px' }}>Building awesome web experiences and mobile apps.</p>
                </div>
                <div className="divider" style={{ margin: '15px 0' }}></div>
                <div>
                    <h3 style={{ fontSize: '19px', fontWeight: '600' }}>Freelancer</h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Self-Employed • 2018 - 2020</p>
                    <p style={{ marginTop: '5px' }}>Created custom solutions for clients worldwide.</p>
                </div>
            </div>

            <div className="ios-card" style={{ padding: '20px' }}>
                <h2>Education</h2>
                <div style={{ marginTop: '15px' }}>
                    <h3 style={{ fontSize: '19px', fontWeight: '600' }}>Computer Science</h3>
                    <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>University of Technology</p>
                </div>
            </div>
        </div>
    );
};

export default Resume;
