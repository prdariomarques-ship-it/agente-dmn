import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  useEffect(() => {
    axios.get('/api/agents').then(res => setAgents(res.data)).catch(console.error);
  }, []);
  return <div><h1>Agents</h1><pre>{JSON.stringify(agents, null, 2)}</pre></div>;
}
