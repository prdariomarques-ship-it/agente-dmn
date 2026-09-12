import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Skills() {
  const [skills, setSkills] = useState<any>(null);
  useEffect(() => {
    axios.get('/api/skills').then(res => setSkills(res.data)).catch(console.error);
  }, []);
  if (!skills) return <div>Loading...</div>;
  return <div><h1>Skills</h1><pre>{JSON.stringify(skills, null, 2)}</pre></div>;
}
