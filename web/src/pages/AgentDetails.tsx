import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export default function AgentDetails() {
  const { id } = useParams();
  const [agent, setAgent] = useState<any>(null);
  useEffect(() => {
    axios.get(`/api/agents/${id}`).then(res => setAgent(res.data)).catch(console.error);
  }, [id]);
  if (!agent) return <div>Loading...</div>;
  return <div><h1>Agent Details</h1><pre>{JSON.stringify(agent, null, 2)}</pre></div>;
}
