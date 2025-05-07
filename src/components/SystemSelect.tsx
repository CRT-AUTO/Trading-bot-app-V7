import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check } from 'lucide-react';

type SystemSelectProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

type TradingSystem = {
  id: string;
  name: string;
  description: string | null;
};

const SystemSelect: React.FC<SystemSelectProps> = ({
  value,
  onChange,
  required = false,
  disabled = false,
  className = ''
}) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [systems, setSystems] = useState<TradingSystem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddNew, setShowAddNew] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [savingNewSystem, setSavingNewSystem] = useState(false);

  // Fetch trading systems on component mount
  useEffect(() => {
    const fetchSystems = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('trading_systems')
          .select('*')
          .eq('user_id', user.id)
          .order('name');
          
        if (error) throw error;
        
        setSystems(data || []);
      } catch (error) {
        console.error('Error fetching trading systems:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSystems();
  }, [supabase, user]);

  // Add new system
  const handleAddSystem = async () => {
    if (!user || !newSystemName.trim()) return;
    
    setSavingNewSystem(true);
    try {
      const { data, error } = await supabase
        .from('trading_systems')
        .insert({
          user_id: user.id,
          name: newSystemName.trim(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Add the new system to the list
      setSystems([...systems, data]);
      
      // Select the new system
      onChange(data.name);
      
      // Reset the form
      setNewSystemName('');
      setShowAddNew(false);
    } catch (error) {
      console.error('Error adding system:', error);
      alert('Failed to add system');
    } finally {
      setSavingNewSystem(false);
    }
  };

  if (showAddNew) {
    return (
      <div className={`flex flex-col space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          New Trading System {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSystemName}
            onChange={(e) => setNewSystemName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            placeholder="Enter system name"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAddSystem}
            disabled={savingNewSystem || !newSystemName.trim()}
            className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setShowAddNew(false)}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Trading System {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex space-x-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || loading}
          required={required}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm 
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="">Select System</option>
          {systems.map((system) => (
            <option key={system.id} value={system.name}>{system.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAddNew(true)}
          disabled={disabled}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default SystemSelect;