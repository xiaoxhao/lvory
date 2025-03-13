import React from 'react';
import '../assets/css/customerCard.css';

const CustomerCard = ({ customer }) => {
  const cardClassName = 'customer-card gray-border-card';
  
  return (
    <div className={cardClassName}>
      <div className="card-header">
        <h4 className="customer-name">{customer.name}</h4>
        <button className="more-options">⋮</button>
      </div>
      
      <p className="customer-description">{customer.description}</p>
      
      <div className="card-footer">
        <div className="date-info">
          <span className="icon calendar-icon"></span>
          <span className="date">{customer.date}</span>
        </div>
        
        <div className="interaction-stats">
          <div className="stat">
            <span className="icon contact-icon"></span>
            <span className="count">{customer.contacts}</span>
          </div>
          <div className="stat">
            <span className="icon message-icon"></span>
            <span className="count">{customer.messages}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerCard; 