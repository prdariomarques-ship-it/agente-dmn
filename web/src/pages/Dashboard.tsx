import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  useEffect(() => {
    axios.get('/api/dashboard').then(res => setMetrics(res.data)).catch(console.error);
  }, []);
  if (!metrics) return <div>Loading...</div>;
  return <div><h1>Dashboard</h1><pre>{JSON.stringify(metrics, null, 2)}</pre></div>;
}
