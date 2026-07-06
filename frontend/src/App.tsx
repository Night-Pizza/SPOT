import AppRouter from './router/AppRouter.tsx';
import { useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import FaceRegistrationModal from './components/face/FaceRegistrationModal';


function App() {
  const { user, loading } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!loading && user.id && !user.faceRegistered) {
      setModalVisible(true);
    } else {
      setModalVisible(false);
    }
  }, [loading, user]);
  return (
      <>
        <AppRouter />
        <FaceRegistrationModal
            visible={modalVisible}
            onSuccess={() => setModalVisible(false)}
        />
      </>
  );
}

export default App;
