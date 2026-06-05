import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../services/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    userName: '',
    password: '',
    email: '',
    phone: '',
    position: '',
    isActive: true,
    userType: 0,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll({
        keyword: search,
        page,
        pageSize,
      });
      setUsers(response.data.items || response.data || []);
      setTotalPages(Math.ceil((response.data.totalCount || response.data.length || 0) / pageSize));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      userName: '',
      password: '',
      email: '',
      phone: '',
      position: '',
      isActive: true,
      userType: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      userName: user.userName,
      password: '',
      email: user.email || '',
      phone: user.phone || '',
      position: user.position || '',
      isActive: user.isActive,
      userType: user.userType,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersApi.delete(id);
        fetchUsers();
      } catch (error) {
        alert('Failed to delete user');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await usersApi.update(editingUser.guid, updateData);
      } else {
        await usersApi.create(formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      alert('Failed to save user');
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Users</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card">
            <div className="card-header">
              <div className="row">
                <div className="col-md-6">
                  <form onSubmit={handleSearch} className="form-inline">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <div className="input-group-append">
                        <button type="submit" className="btn btn-default">
                          <i className="fas fa-search"></i>
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
                <div className="col-md-6 text-right">
                  <button className="btn btn-primary" onClick={handleAdd}>
                    <i className="fas fa-plus"></i> Add User
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body table-responsive p-0">
              {loading ? (
                <div className="text-center p-3">Loading...</div>
              ) : (
                <table className="table table-hover text-nowrap">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Position</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.guid}>
                        <td>{user.name}</td>
                        <td>{user.userName}</td>
                        <td>{user.email}</td>
                        <td>{user.position}</td>
                        <td>
                          <span className={`badge badge-${user.isActive ? 'success' : 'danger'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-info mr-1" onClick={() => handleEdit(user)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user.guid)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card-footer">
              <nav>
                <ul className="pagination pagination-sm m-0 float-right">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p - 1)}>Previous</button>
                  </li>
                  {[...Array(totalPages)].map((_, i) => (
                    <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p + 1)}>Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">{editingUser ? 'Edit User' : 'Add User'}</h4>
                <button type="button" className="close" onClick={() => setShowModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.userName}
                      onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                      required
                      disabled={!!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password {editingUser && '(leave blank to keep current)'}</label>
                    <input
                      type="password"
                      className="form-control"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Position</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>User Type</label>
                    <select
                      className="form-control"
                      value={formData.userType}
                      onChange={(e) => setFormData({ ...formData, userType: parseInt(e.target.value) })}
                    >
                      <option value={0}>User</option>
                      <option value={1}>Admin</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <div className="custom-control custom-switch">
                      <input
                        type="checkbox"
                        className="custom-control-input"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <label className="custom-control-label" htmlFor="isActive">Active</label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;
