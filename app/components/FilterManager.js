// FilterManager.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';

const FilterManager = ({ filters, setFilters, combinedLogs }) => {
  const [filterType, setFilterType] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    level: [],
    host: [],
    request_method: [],
  });

  // Fetch filter options whenever combinedLogs changes
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const response = await fetch('http://localhost:8000/api/filter-type'); // Adjust the URL to your actual endpoint
        if (response.status === 304) {
          return; // No update needed if response is 304
        }
  
        if (response.ok) {
          const data = await response.json();
  
          // Populate filterOptions based on the API response
          setFilterOptions({
            level: data.levels.map(level => level.level_type),
            host: data.hosts.map(host => host.host_name),
            request_method: data.request_methods.map(method => method.request_method_type),
          });
        } else {
          console.error('Failed to fetch filter options:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    }

    fetchFilterOptions();
  }, [combinedLogs]); // Runs whenever combinedLogs changes

  const addFilter = () => {
    if (filterType && filterValue && !filters.some(f => f.type === filterType && f.value === filterValue)) {
      setFilters([...filters, { type: filterType, value: filterValue }]);
      setFilterValue(''); // Clear selected value
    }
  };

  const removeFilter = (filterToRemove) => {
    setFilters(filters.filter(filter => filter !== filterToRemove));
  };

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Box display="flex" alignItems="center" gap={2}>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Filter Type</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterValue(''); // Reset filter value when filter type changes
            }}
            label="Filter Type"
          >
            <MenuItem value=""><em>None</em></MenuItem>
            <MenuItem value="level">Log Level</MenuItem>
            <MenuItem value="host">Host</MenuItem>
            <MenuItem value="request_method">Request Method</MenuItem>
          </Select>
        </FormControl>
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }} disabled={!filterType}>
          <InputLabel>{filterType ? `Select ${filterType}` : ""}</InputLabel>
          <Select
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            label={`Select ${filterType}`}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {filterType && filterOptions[filterType].map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={addFilter}>Add</Button>
      </Box>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {filters.map((filter, index) => (
          <Chip
            key={index}
            label={`${filter.type}: ${filter.value}`}
            onDelete={() => removeFilter(filter)}
          />
        ))}
      </Box>
    </Box>
  );
};

export default FilterManager;
