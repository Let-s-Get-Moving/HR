import React, { useState, useEffect } from "react";
import { API } from '../config/api.js';

export default function CommissionLegend() {
  const [salesAgentSettings, setSalesAgentSettings] = useState(null);
  const [salesManagerSettings, setSalesManagerSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default values fallback
  const defaultSalesAgentThresholds = [
    { leadPct: 30, revenue: 115000, commission: 3.5 },
    { leadPct: 30, revenue: 115000, commission: 4 },
    { leadPct: 30, revenue: 115000, commission: 4 },
    { leadPct: 30, revenue: 115000, commission: 4.5 },
    { leadPct: 35, revenue: 160000, commission: 5 },
    { leadPct: 40, revenue: 200000, commission: 5.5 },
    { leadPct: 55, revenue: 250000, commission: 6 }
  ];
  const defaultVacationPackage = 5000;
  const defaultSalesManagerThresholds = [
    { min: 0, max: 19, commission: 0.25 },
    { min: 20, max: 24, commission: 0.275 },
    { min: 25, max: 29, commission: 0.30 },
    { min: 30, max: 34, commission: 0.35 },
    { min: 35, max: 39, commission: 0.40 },
    { min: 40, max: 100, commission: 0.45 }
  ];

  useEffect(() => {
    loadCommissionSettings();
  }, []);

  const loadCommissionSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = await API('/api/settings/system');
      
      // Parse Sales Agent settings
      const agentThresholds = [];
      let vacationPackage = defaultVacationPackage;

      for (let i = 1; i <= 7; i++) {
        const key = `sales_agent_threshold_${i}`;
        const setting = settings.find(s => s.key === key);
        
        if (setting && setting.value) {
          const parts = setting.value.split(',');
          if (parts.length === 3) {
            agentThresholds.push({
              leadPct: parseFloat(parts[0]),
              revenue: parseFloat(parts[1]),
              commission: parseFloat(parts[2])
            });
          } else {
            agentThresholds.push(defaultSalesAgentThresholds[i - 1]);
          }
        } else {
          agentThresholds.push(defaultSalesAgentThresholds[i - 1]);
        }
      }

      // Get vacation package value
      const vacationSetting = settings.find(s => s.key === 'sales_agent_vacation_package_value');
      if (vacationSetting && vacationSetting.value) {
        vacationPackage = parseFloat(vacationSetting.value) || defaultVacationPackage;
      }

      // Parse Sales Manager settings
      const managerThresholds = [];
      for (let i = 1; i <= 6; i++) {
        const key = `sales_manager_threshold_${i}`;
        const setting = settings.find(s => s.key === key);
        
        if (setting && setting.value) {
          const parts = setting.value.split(',');
          if (parts.length === 3) {
            managerThresholds.push({
              min: parseFloat(parts[0]),
              max: parseFloat(parts[1]),
              commission: parseFloat(parts[2])
            });
          } else {
            managerThresholds.push(defaultSalesManagerThresholds[i - 1]);
          }
        } else {
          managerThresholds.push(defaultSalesManagerThresholds[i - 1]);
        }
      }

      setSalesAgentSettings({ thresholds: agentThresholds, vacationPackage });
      setSalesManagerSettings({ thresholds: managerThresholds });
    } catch (err) {
      console.error('Error loading commission settings:', err);
      setError(err.message);
      // Use defaults on error
      setSalesAgentSettings({ thresholds: defaultSalesAgentThresholds, vacationPackage: defaultVacationPackage });
      setSalesManagerSettings({ thresholds: defaultSalesManagerThresholds });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  if (loading) {
    return (
      <div className="card p-6">
        <div className="text-center text-tahoe-text-secondary">Loading commission structure...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sales Agents Commission Structure */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-tahoe-text-primary">
          Commission Structure for Sales Agents
        </h3>
        <p className="text-sm text-tahoe-text-secondary mb-4">
          The Proportionate Percentage will be determined based on the following calculation:
        </p>
        <div className="space-y-3">
          {salesAgentSettings?.thresholds.map((threshold, index) => {
            // Handle threshold 7 specially - show both 50% and 55% conditions if >= 55%
            if (index === 6 && threshold.leadPct >= 55) {
              return (
                <React.Fragment key={index}>
                  <div className="p-3 rounded-tahoe-input border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                    <p className="text-sm text-tahoe-text-primary">
                      If the Employee converts more than 50% of the leads & more than {formatCurrency(threshold.revenue)} of the revenue = {formatPercentage(threshold.commission)}
                    </p>
                  </div>
                  <div className="p-3 rounded-tahoe-input border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}>
                    <p className="text-sm text-tahoe-text-primary">
                      If the Employee converts more than {formatPercentage(threshold.leadPct)} of the leads & more than {formatCurrency(threshold.revenue)} of the revenue = {formatPercentage(threshold.commission)} + Vacation Package valued up to {formatCurrency(salesAgentSettings.vacationPackage)}
                    </p>
                  </div>
                </React.Fragment>
              );
            }
            
            let conditionText = '';
            if (index === 0) {
              conditionText = `If the Employee converts less than ${formatPercentage(threshold.leadPct)} of the leads & less than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 1) {
              conditionText = `If the Employee converts more than ${formatPercentage(threshold.leadPct)} of the leads & less than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 2) {
              conditionText = `If the Employee converts less than ${formatPercentage(threshold.leadPct)} of the leads & more than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 3) {
              conditionText = `If the Employee converts more than ${formatPercentage(threshold.leadPct)} of the leads & more than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 4) {
              conditionText = `If the Employee converts more than ${formatPercentage(threshold.leadPct)} of the leads & more than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 5) {
              conditionText = `If the Employee converts more than ${formatPercentage(threshold.leadPct)} of the leads & more than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            } else if (index === 6) {
              conditionText = `If the Employee converts more than ${formatPercentage(threshold.leadPct)} of the leads & more than ${formatCurrency(threshold.revenue)} of the revenue = ${formatPercentage(threshold.commission)}`;
            }

            return (
              <div
                key={index}
                className="p-3 rounded-tahoe-input border"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <p className="text-sm text-tahoe-text-primary">{conditionText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sales Managers Commission Structure */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4 text-tahoe-text-primary">
          Commission Structure for Sales Managers
        </h3>
        <p className="text-sm text-tahoe-text-secondary mb-4">
          The Proportionate Percentage will be determined based on the following calculation:
        </p>
        <div className="space-y-3">
          {salesManagerSettings?.thresholds.map((threshold, index) => {
            const isLast = index === salesManagerSettings.thresholds.length - 1;
            const rangeText = isLast 
              ? `${formatPercentage(threshold.min)} and above`
              : `${formatPercentage(threshold.min)} - ${formatPercentage(threshold.max)}`;
            
            const conditionText = `If the Booking Percentage of Sales Agent is ${rangeText}, commission earned will be ${formatPercentage(threshold.commission)} of the revenue`;

            return (
              <div
                key={index}
                className="p-3 rounded-tahoe-input border"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                <p className="text-sm text-tahoe-text-primary">{conditionText}</p>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 mt-2">
          Note: Using default values due to error loading settings
        </div>
      )}
    </div>
  );
}

