import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ManageUsers.css';

const emptyForm = {
  id: null,
  name: '',
  email: '',
  password: '',
  role: 'op_ex',
};

const ManageUsers = () => {
  const { users, createUser, updateUser, deleteUser, roleLabels, currentUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.name.localeCompare(b.name)),
    [users]
  );

  const openCreateModal = () => {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setForm({
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setError('');
  };

  const onSubmit = (event) => {
    event.preventDefault();
    const action = form.id ? updateUser(form.id, form) : createUser(form);
    if (!action.ok) {
      setError(action.error || 'Unable to save user.');
      return;
    }
    closeModal();
  };

  const onDelete = (userId) => {
    const action = deleteUser(userId);
    if (!action.ok) {
      setError(action.error || 'Unable to delete user.');
    }
  };

  return (
    <div className="uac-root">
      <main className="uac-main">
        <div className="uac-main-header">
          <h2>Users</h2>
          <button type="button" className="uac-add-btn" onClick={openCreateModal}>
            <Plus size={14} />
            Create User
          </button>
        </div>

        <table className="uac-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>E-mail</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{roleLabels[user.role]}</td>
                <td>
                  <div className="uac-actions">
                    <button
                      type="button"
                      className="uac-icon-btn"
                      aria-label={`Edit ${user.name}`}
                      onClick={() => openEditModal(user)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="uac-icon-btn"
                      aria-label={`Delete ${user.name}`}
                      onClick={() => onDelete(user.id)}
                      disabled={user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {modalOpen && (
        <div className="uac-modal-overlay" onClick={closeModal}>
          <div className="uac-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="uac-close" onClick={closeModal} aria-label="Close">
              x
            </button>
            <h3>Access Control</h3>

            <form className="uac-form" onSubmit={onSubmit}>
              <label>
                <span>User Name:</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>E-mail:</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>

              <label>
                <span>Password:</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder={form.id ? 'Leave blank to keep current password' : ''}
                  required={!form.id}
                />
              </label>

              <label>
                <span>Role:</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  <option value="op_ex">Operations Executive</option>
                  <option value="planner">Campaign Planner</option>
                  <option value="manager">Campaign Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              {error && <p className="uac-error">{error}</p>}

              <div className="uac-form-actions">
                <button type="button" className="uac-btn uac-btn--ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="uac-btn uac-btn--primary">
                  {form.id ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
