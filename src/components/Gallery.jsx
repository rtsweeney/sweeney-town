const Gallery = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Photos</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {[1, 2, 3, 4].map(id => (
                    <div key={id} style={{
                        aspectRatio: '1',
                        backgroundColor: '#E5E5EA',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px'
                    }}>
                        📷
                    </div>
                ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)' }}>
                Uploads coming soon...
            </p>
        </div>
    );
};

export default Gallery;
