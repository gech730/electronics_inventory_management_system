import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

export const Dashboard = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('7D');
  const [stats, setStats] = useState({
    products: 248,
    categories: 12,
    users: 5,
    lowStock: 8,
  });

  // Load real data from Laravel API
  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        const [productsRes, categoriesRes, usersRes] = await Promise.all([
          api.getProducts({ per_page: 100 }).catch(() => null),
          api.getCategories({ per_page: 100 }).catch(() => null),
          api.getUsers().catch(() => null),
        ]);

        const products = productsRes?.data || [];
        const lowStockCount = products.filter(
          (p) => Number(p.quantity) <= Number(p.minimum_stock)
        ).length;

        setStats({
          products: productsRes?.total ?? products.length ?? 248,
          categories: categoriesRes?.total ?? (categoriesRes?.data ? categoriesRes.data.length : 12),
          users: usersRes?.total ?? (usersRes?.data ? usersRes.data.length : 5),
          lowStock: lowStockCount || 8,
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, []);

  // Bar chart sample values for the 7 days of the week (matching reference image)
  const chartData = [
    { day: 'Mon', value: 75, height: '37.5%' },
    { day: 'Tue', value: 100, height: '50%' },
    { day: 'Wed', value: 105, height: '52.5%' },
    { day: 'Thu', value: 120, height: '60%' },
    { day: 'Fri', value: 105, height: '52.5%' },
    { day: 'Sat', value: 135, height: '67.5%' },
    { day: 'Sun', value: 165, height: '82.5%' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b' }}>
          Welcome, {user?.name || 'Admin'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem', marginTop: 4 }}>
          Here's what's happening with your inventory today.
        </p>
      </div>

      {/* 4 Stat Cards in a Row (Matching image.png) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 20,
        }}
      >
        {/* Card 1: Total Products */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '22px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Icon name="package" size={24} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748b' }}>
              Total Products
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b' }}>
                {stats.products}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00b074', marginTop: 2 }}>
              ↑ 12%
            </span>
          </div>
        </div>

        {/* Card 2: Total Categories */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '22px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#00b074',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Icon name="tag" size={24} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748b' }}>
              Total Categories
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b' }}>
                {stats.categories}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00b074', marginTop: 2 }}>
              ↑ 2%
            </span>
          </div>
        </div>

        {/* Card 3: Total Users */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '22px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Icon name="users" size={24} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748b' }}>
              Total Users
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b' }}>
                {stats.users}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00b074', marginTop: 2 }}>
              ↑ 1%
            </span>
          </div>
        </div>

        {/* Card 4: Low Stock Items */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '22px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#ff9f43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            <Icon name="alert" size={24} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 500, color: '#64748b' }}>
              Low Stock Items
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1e293b' }}>
                {stats.lowStock}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ef4444', marginTop: 2 }}>
              ↓ 6%
            </span>
          </div>
        </div>
      </div>

      {/* Middle Section: Inventory Overview Bar Chart + Recent Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr',
          gap: 20,
        }}
      >
        {/* Left: Inventory Overview Bar Chart Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Card Header with Time Filter Pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 28,
            }}
          >
            <h3 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#1e293b' }}>
              Inventory Overview
            </h3>

            {/* Time Filter Pills (7D, 30D, 3M, 1Y) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#f8fafc',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              {['7D', '30D', '3M', '1Y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setActiveRange(range)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    background: activeRange === range ? '#1677ff' : 'transparent',
                    color: activeRange === range ? '#ffffff' : '#64748b',
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Container */}
          <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 220 }}>
            {/* Y-Axis scale */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                paddingBottom: 26,
                color: '#94a3b8',
                fontSize: '0.76rem',
                fontWeight: 600,
                textAlign: 'right',
                width: 32,
              }}
            >
              <span>200</span>
              <span>150</span>
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>

            {/* Chart Area with Gridlines & Bars */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Horizontal Gridlines */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  bottom: 26,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
                <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
                <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
                <div style={{ borderBottom: '1px dashed #f1f5f9', width: '100%' }} />
                <div style={{ borderBottom: '1px solid #e2e8f0', width: '100%' }} />
              </div>

              {/* Bars Columns */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  paddingBottom: 26,
                  zIndex: 2,
                }}
              >
                {chartData.map((item) => (
                  <div
                    key={item.day}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: '100%',
                      justifyContent: 'flex-end',
                      width: '10%',
                      position: 'relative',
                    }}
                  >
                    {/* Bar */}
                    <div
                      style={{
                        width: '100%',
                        maxWidth: 42,
                        height: item.height,
                        background: '#1677ff',
                        borderRadius: '6px 6px 0 0',
                        transition: 'height 400ms ease, background 150ms ease',
                        cursor: 'pointer',
                      }}
                      title={`${item.day}: ${item.value} units`}
                    />

                    {/* Day label */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: -22,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#64748b',
                      }}
                    >
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Activity Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px 28px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}
          >
            <h3 style={{ fontSize: '1.12rem', fontWeight: 700, color: '#1e293b' }}>
              Recent Activity
            </h3>
            <Link
              to="/products"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1677ff',
                textDecoration: 'none',
              }}
            >
              View All
            </Link>
          </div>

          {/* Activity List (Exact items from image.png) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Item 1: New product added */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(22, 119, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1677ff',
                  }}
                >
                  <Icon name="package" size={20} color="#1677ff" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    New product added
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                    Laptop (HP)
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                2 hours ago
              </span>
            </div>

            {/* Item 2: User created */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6366f1',
                  }}
                >
                  <Icon name="users" size={20} color="#6366f1" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    User created
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                    Manager - Desalegn Kasye
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                4 hours ago
              </span>
            </div>

            {/* Item 3: Stock updated */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(0, 176, 116, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00b074',
                  }}
                >
                  <Icon name="package" size={20} color="#00b074" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Stock updated
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                    Wireless Mouse - 20 units
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                5 hours ago
              </span>
            </div>

            {/* Item 4: Category created */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(255, 159, 67, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ff9f43',
                  }}
                >
                  <Icon name="tag" size={20} color="#ff9f43" />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                    Category created
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                    Accessories
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                6 hours ago
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
