import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Memory() {
  const [memory, setMemory] = useState<any>(null);
  useEffect(() => {
    axios.get('/api/memory').then(res => setMemory(res.data)).catch(console.error);
  }, []);
  if (!memory) return <div>Loading...</div>;
  return <div><h1>Memory</h1><pre>{JSON.stringify(memory, null, 2)}</pre></div>;
}
