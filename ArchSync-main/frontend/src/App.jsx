import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import CanvasPage from './pages/CanvasPage';
import Home from './pages/Home';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Home />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Routes>
    </Router>
  );
}

export default App;
