import React from 'react';
import { Link } from 'react-router-dom';
import './styles.module.css';

const Main: React.FC = () => {
  return (
    <div className="main">
      <h1>Welcome page</h1>
      <div className="button-container">
        <Link to="/explorer">
          <button>Explorer</button>
        </Link>
        <Link to="/planet">
          <button>Planet view</button>
        </Link>
      </div>
    </div>
  );
};

export default Main;
