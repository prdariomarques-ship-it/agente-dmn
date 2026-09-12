import React from 'react';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Agents from './pages/Agents';
import AgentDetails from './pages/AgentDetails';
import Memory from './pages/Memory';
import Logs from './pages/Logs';
import Skills from './pages/Skills';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function Sidebar() {
  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 min-h-screen p-4 flex flex-col">
      <div className="text-xl font-bold text-white mb-8">DARIUS STITCH</div>
      <nav className="flex flex-col gap-2">
        <Link to="/" className="text-gray-300 hover:text-white p-2">Dashboard</Link>
        <Link to="/tasks" className="text-gray-300 hover:text-white p-2">Tasks</Link>
        <Link to="/agents" className="text-gray-300 hover:text-white p-2">Agents</Link>
        <Link to="/memory" className="text-gray-300 hover:text-white p-2">Memory</Link>
        <Link to="/skills" className="text-gray-300 hover:text-white p-2">Skills</Link>
        <Link to="/logs" className="text-gray-300 hover:text-white p-2">Logs</Link>
      </nav>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-dark-900 min-h-screen text-gray-200">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/:id" element={<AgentDetails />} />
            <Route path="/memory" element={<Memory />} />
            <Route path="/skills" element={<Skills />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
