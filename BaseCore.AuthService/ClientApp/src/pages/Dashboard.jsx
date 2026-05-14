import React, { useState, useEffect } from 'react';
import { productsApi, usersApi, categoriesApi } from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    users: 0,
    categories: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [productsRes, usersRes, categoriesRes] = await Promise.all([
          productsApi.getAll({ pageSize: 1 }),
          usersApi.getAll({ pageSize: 1 }),
          categoriesApi.getAll(),
        ]);
        setStats({
          products: productsRes.data.totalCount || productsRes.data.length || 0,
          users: usersRes.data.totalCount || usersRes.data.length || 0,
          categories: categoriesRes.data.length || 0,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6">
              <h1 className="m-0">Dashboard</h1>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-3 col-6">
              <div className="small-box bg-info">
                <div className="inner">
                  <h3>{stats.products}</h3>
                  <p>Products</p>
                </div>
                <div className="icon">
                  <i className="fas fa-shopping-cart"></i>
                </div>
                <a href="/products" className="small-box-footer">
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-success">
                <div className="inner">
                  <h3>{stats.categories}</h3>
                  <p>Categories</p>
                </div>
                <div className="icon">
                  <i className="fas fa-tags"></i>
                </div>
                <a href="/categories" className="small-box-footer">
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-warning">
                <div className="inner">
                  <h3>{stats.users}</h3>
                  <p>Users</p>
                </div>
                <div className="icon">
                  <i className="fas fa-users"></i>
                </div>
                <a href="/users" className="small-box-footer">
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-6">
              <div className="small-box bg-danger">
                <div className="inner">
                  <h3>0</h3>
                  <p>Orders</p>
                </div>
                <div className="icon">
                  <i className="fas fa-chart-pie"></i>
                </div>
                <a href="#" className="small-box-footer">
                  More info <i className="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Welcome to BaseCore Admin</h3>
                </div>
                <div className="card-body">
                  <p>This is the admin dashboard for managing products, categories, and users.</p>
                  <ul>
                    <li><strong>Products:</strong> Manage your product catalog</li>
                    <li><strong>Categories:</strong> Organize products into categories</li>
                    <li><strong>Users:</strong> Manage user accounts</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Dashboard;
