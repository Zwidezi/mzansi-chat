import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component } from 'react';
import { AuthProvider } from './context/AuthContext';
import { CallProvider } from './hooks/useCall';
import CallOverlay from './components/call/CallOverlay';
import MainShell from './components/layout/MainShell';
import AuthFlow from './screens/AuthFlow';
import ChatList from './screens/ChatList';
import ChatScreen from './screens/ChatScreen';
import Updates from './screens/Updates';
import Profile from './screens/Profile';
import Savings from './screens/Savings';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: '#0f0f0f',
          color: '#fff',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Oops! Something went wrong</h1>
          <p style={{ color: '#888', marginBottom: '24px' }}>{this.state.error?.message}</p>
          <button 
            onClick={() => {
              // Only clear session data — preserve PIN hash and WebAuthn enrollment
              localStorage.removeItem('mzansi_session');
              localStorage.removeItem('mzansi_ghost_mode');
              localStorage.removeItem('mzansi_auth_attempts');
              window.location.href = '/';
            }}
            style={{
              padding: '12px 24px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Restart App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <CallProvider>
             <CallOverlay />
             <Routes>
                {/* Public/Auth Routes */}
                <Route path="/" element={<AuthFlow />} />
                <Route path="/restore" element={<AuthFlow defaultStep="signin" />} />
                
                {/* Authenticated Routes wrapped in MainShell */}
                <Route element={<MainShell />}>
                   <Route path="/chats" element={<ChatList />} />
                   <Route path="/chat/:id" element={<ChatScreen />} />
                   <Route path="/updates" element={<Updates />} />
                   <Route path="/profile" element={<Profile />} />
                   <Route path="/savings" element={<Savings />} />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<AuthFlow />} />
             </Routes>
          </CallProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;
