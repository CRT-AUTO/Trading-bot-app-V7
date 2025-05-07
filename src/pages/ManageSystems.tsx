import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash, RefreshCw, Check, X } from 'lucide-react';

type TradingSystem = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

const ManageSystems: React.FC = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  
  const [systems, setSystems] = useState<TradingSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch systems
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
      console.error('Error fetching systems:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystems();
  }, [supabase, user]);

  // Reset form
  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
    setShowAddForm(false);
  };

  // Add new system
  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trading_systems')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      await fetchSystems();
      resetForm();
    } catch (error) {
      console.error('Error adding system:', error);
      alert('Failed to add system');
    } finally {
      setSaving(false);
    }
  };

  // Update system
  const handleUpdateSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !editingId || !name.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('trading_systems')
        .update({
          name: name.trim(),
          description: description.trim() || null
        })
        .eq('id', editingId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      await fetchSystems();
      resetForm();
    } catch (error) {
      console.error('Error updating system:', error);
      alert('Failed to update system');
    } finally {
      setSaving(false);
    }
  };

  // Delete system
  const handleDeleteSystem = async (id: string) => {
    if (!user || !confirm('Are you sure you want to delete this system?')) return;
    
    try {
      const { error } = await supabase
        .from('trading_systems')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      await fetchSystems();
    } catch (error) {
      console.error('Error deleting system:', error);
      alert('Failed to delete system');
    }
  };

  // Set up form for editing
  const handleEditSystem = (system: TradingSystem) => {
    setName(system.name);
    setDescription(system.description || '');
    setEditingId(system.id);
    setShowAddForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Trading Systems</h1>
        
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add New System
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit System' : 'Add New System'}
          </h2>
          
          <form onSubmit={editingId ? handleUpdateSystem : handleAddSystem}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter system name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Enter system description"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              >
                {saving ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Check size={16} className="mr-2" />
                )}
                {editingId ? 'Update System' : 'Save System'}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="mr-2 inline-block" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Systems List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw size={32} className="text-blue-600 animate-spin" />
        </div>
      ) : systems.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <p className="text-gray-500">No trading systems found. Add your first system to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm">
          <ul className="divide-y divide-gray-200">
            {systems.map((system) => (
              <li key={system.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{system.name}</h3>
                    {system.description && (
                      <p className="mt-1 text-sm text-gray-600">{system.description}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Created: {new Date(system.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditSystem(system)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteSystem(system.id)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ManageSystems;