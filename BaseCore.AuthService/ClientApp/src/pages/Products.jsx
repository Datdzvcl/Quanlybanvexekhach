import React, { useState, useEffect, useCallback } from 'react';
import { productsApi, categoriesApi } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    imageUrl: '',
    description: '',
    categoryId: 0,
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsApi.getAll({
        keyword: search,
        page,
        pageSize,
      });
      setProducts(response.data.items || response.data || []);
      setTotalPages(Math.ceil((response.data.totalCount || response.data.length || 0) / pageSize));
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
    setLoading(false);
  }, [search, page, pageSize]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      stock: 0,
      imageUrl: '',
      description: '',
      categoryId: categories[0]?.id || 0,
    });
    setShowModal(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      description: product.description || '',
      categoryId: product.categoryId,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsApi.delete(id);
        fetchProducts();
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
      } else {
        await productsApi.create(formData);
      }
      setShowModal(false);
      fetchProducts();
    } catch (error) {
      alert('Failed to save product');
    }
  };

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Products</h1>
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
                    <i className="fas fa-plus"></i> Add Product
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
                      <th>ID</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.id}</td>
                        <td>{product.name}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>{product.stock}</td>
                        <td>{categories.find(c => c.id === product.categoryId)?.name || '-'}</td>
                        <td>
                          <button className="btn btn-sm btn-info mr-1" onClick={() => handleEdit(product)}>
                            <i className="fas fa-edit"></i>
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(product.id)}>
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
                <h4 className="modal-title">{editingProduct ? 'Edit Product' : 'Add Product'}</h4>
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
                    <label>Price</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="form-control"
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                      required
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Image URL</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      className="form-control"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
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

export default Products;
