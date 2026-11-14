import React, { useState } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  UploadCloud, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  X, 
  Database,
  Flame,
  AlertCircle
} from 'lucide-react';
import { firebaseConfig } from '../firebase/config';
import { seedDatabaseToFirebase, checkFirebaseConnection } from '../firebase/firestoreService';

export default function FirebaseSyncModal({ 
  isOpen, 
  onClose, 
  localData, 
  firebaseStatus, 
  onNotify,
  onRefreshData 
}) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);
  const [statusResult, setStatusResult] = useState(null);

  if (!isOpen) return null;

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Modo desarrollo / pruebas de fidelización
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(firestoreRulesSnippet);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 3000);
    if (onNotify) onNotify('Reglas de Firestore copiadas al portapapeles', 'info');
  };

  const handleTestConnection = async () => {
    setIsChecking(true);
    const res = await checkFirebaseConnection();
    setStatusResult(res);
    setIsChecking(false);
    if (res.connected) {
      if (onNotify) onNotify('¡Conexión exitosa con Cloud Firestore!', 'success');
    } else {
      if (onNotify) onNotify(res.message || 'Error de conexión con el servidor Cloud', 'warning');
    }
  };

  const handleSeedToCloud = async () => {
    if (!window.confirm('¿Deseas subir todos los datos actuales (tiendas, clientes, reglas, canjes y compras) a Cloud Firestore?')) {
      return;
    }

    setIsSyncing(true);
    const result = await seedDatabaseToFirebase(localData);
    setIsSyncing(false);

    if (result.success) {
      if (onNotify) onNotify('¡Datos sincronizados exitosamente con Cloud Firestore!', 'success');
      if (onRefreshData) onRefreshData();
    } else {
      const errMsg = result.error?.code === 'permission-denied'
        ? 'Permiso denegado: Revisa las reglas de seguridad en la consola Cloud.'
        : (result.error?.message || 'Error al sincronizar con el servidor Cloud');
      if (onNotify) onNotify(errMsg, 'error');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-subtle)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #FFF9F0 0%, #FFFFFF 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#FFA000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(255, 160, 0, 0.3)'
            }}>
              <Flame size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Servidor Cloud & Base de Datos
                </h3>
                <span className="badge" style={{
                  background: firebaseStatus === 'connected' ? '#DCFCE7' : '#FEF3C7',
                  color: firebaseStatus === 'connected' ? '#166534' : '#92400E',
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {firebaseStatus === 'connected' ? 'En Línea' : 'Configurado'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Proyecto ID: <strong style={{ color: 'var(--c-primary)' }}>{firebaseConfig.projectId}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Project Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROYECTO CLOUD</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {firebaseConfig.projectId}
              </div>
            </div>

            <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>STORAGE BUCKET</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px', wordBreak: 'break-all' }}>
                {firebaseConfig.storageBucket}
              </div>
            </div>

            <div style={{ background: 'var(--bg-app)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANALYTICS ID</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                {firebaseConfig.measurementId || 'G-0HR56LJS80'}
              </div>
            </div>
          </div>

          {/* Cloud Action Buttons */}
          <div style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 100%)',
            border: '1.5px solid #BBF7D0',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#166534' }}>
                  Sincronización Cloud Firestore
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#15803D' }}>
                  Sube los {localData.clients?.length || 0} clientes, {localData.stores?.length || 0} tiendas y reglas a la base de datos en la nube.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isChecking}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '7px 12px', gap: '6px' }}
                >
                  <RefreshCw size={14} className={isChecking ? 'spin' : ''} />
                  <span>{isChecking ? 'Probando...' : 'Probar Conexión'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSeedToCloud}
                  disabled={isSyncing}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '7px 14px', gap: '6px', background: '#16A34A', borderColor: '#16A34A' }}
                >
                  <UploadCloud size={15} />
                  <span>{isSyncing ? 'Subiendo a la nube...' : 'Subir Datos a Firestore'}</span>
                </button>
              </div>
            </div>

            {statusResult && (
              <div style={{
                background: statusResult.connected ? '#DCFCE7' : '#FEF2F2',
                border: `1px solid ${statusResult.connected ? '#86EFAC' : '#FCA5A5'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: statusResult.connected ? '#166534' : '#991B1B',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {statusResult.connected ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{statusResult.message}</span>
              </div>
            )}
          </div>

          {/* Firebase Rules Notice & Snippet */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={16} color="var(--c-primary)" />
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Reglas de Seguridad recomendadas para Cloud Firestore:
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyRules}
                style={{
                  background: 'none',
                  border: '1px solid var(--border-subtle)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: copiedRules ? '#16A34A' : 'var(--text-muted)'
                }}
              >
                {copiedRules ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                <span>{copiedRules ? '¡Copiado!' : 'Copiar Reglas'}</span>
              </button>
            </div>

            <pre style={{
              background: '#0F172A',
              color: '#38BDF8',
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              overflowX: 'auto',
              margin: '0 0 10px 0',
              fontFamily: 'monospace'
            }}>
              {firestoreRulesSnippet}
            </pre>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              💡 <strong>Paso en Consola Cloud:</strong> Ve a{' '}
              <a 
                href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/rules`} 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--c-primary)', fontWeight: 600, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
              >
                Firestore Database &gt; Reglas <ExternalLink size={11} />
              </a>
              , pega el bloque anterior y haz clic en <strong>Publicar</strong>.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-app)'
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-outline"
            style={{ fontSize: '0.84rem', padding: '6px 18px' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
