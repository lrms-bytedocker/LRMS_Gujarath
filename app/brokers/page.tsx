export default function Custom404() {
  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>404</h1>
        <h2 style={styles.subtitle}>Page Not Found</h2>
        <p style={styles.description}>
          Under Development
        </p>
        <a href="/land-master" style={styles.button}>
          Go Back Home
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    textAlign: 'center',
    padding: '2rem',
  },
  title: {
    fontSize: '6rem',
    fontWeight: 'bold',
    color: '#333',
    margin: '0',
    lineHeight: '1',
  },
  subtitle: {
    fontSize: '2rem',
    color: '#666',
    margin: '1rem 0',
    fontWeight: 'normal',
  },
  description: {
    fontSize: '1.1rem',
    color: '#888',
    margin: '1rem 0 2rem',
    maxWidth: '400px',
    lineHeight: '1.6',
  },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#0070f3',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '5px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
};