import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

const App = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
