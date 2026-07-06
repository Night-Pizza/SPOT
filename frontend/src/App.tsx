import AppRouter from './router/AppRouter.tsx';

function App() {
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
