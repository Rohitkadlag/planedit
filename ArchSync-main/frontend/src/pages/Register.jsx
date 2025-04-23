import { useState } from 'react';
import { registerUser } from '../api/auth';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = await registerUser(form);
    setMessage(data.message || 'Registered Successfully');
    localStorage.setItem('token', data.token);
    console.log(data);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Register</h2>
      {message && <p className="text-green-600">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Username" className="input" onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input type="email" placeholder="Email" className="input" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password" className="input" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Register</button>
      </form>
    </div>
  );
}