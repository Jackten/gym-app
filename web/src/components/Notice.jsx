import React from 'react';
import { useApp } from '../contexts/AppContext';

export default function Notice() {
  const { notice } = useApp();
  if (!notice) return null;
  return <div className="notice">{notice}</div>;
}
