import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Logs() {
  const [logs, setLogs] = useState<any>(null);
  useEffect(() => {
    axios.get('/api/logs').then(res => setLogs(res.data)).catch(console.error);
  }, []);
  if (!logs) return <div>Loading...</div>;
  return <div><h1>Logs</h1><pre>{JSON.stringify(logs, null, 2)}</pre></div>;
}
