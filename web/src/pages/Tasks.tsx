import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => {
    axios.get('/api/tasks').then(res => setTasks(res.data)).catch(console.error);
  }, []);
  return <div><h1>Tasks Pipeline</h1><pre>{JSON.stringify(tasks, null, 2)}</pre></div>;
}
