import React from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[fidely ErrorBoundary] Uncaught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#FFFFFF',
            border: '1.5px solid #FCA5A5',
            borderRadius: '16px',
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertTriangle size={28} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
              Ocurrió un error al cargar la vista
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '20px', lineHeight: 1.5 }}>
              Hubo una interrupción inesperada en la interfaz. No te preocupes, tus datos están a salvo.
            </p>

            {this.state.error && (
              <div style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.76rem',
                color: '#DC2626',
                fontFamily: 'monospace',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '20px'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  try {
                    if ('caches' in window) {
                      caches.keys().then((names) => {
                        names.forEach((name) => caches.delete(name));
                      });
                    }
                  } catch (e) {}
                  window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
                }}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  fontSize: '0.88rem'
                }}
              >
                <RefreshCw size={15} />
                <span>Recargar</span>
              </button>
              <button
                onClick={() => {
                  if (this.props.onResetRole) {
                    this.props.onResetRole();
                  } else {
                    window.location.href = '/';
                  }
                  this.setState({ hasError: false, error: null });
                }}
                className="btn btn-outline"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  fontSize: '0.88rem'
                }}
              >
                <LogIn size={15} />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
