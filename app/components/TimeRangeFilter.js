"use client";
import React, { useState, useEffect } from "react";
import { Box, FormControl, InputLabel, Select, MenuItem } from "@mui/material";

const TimeRangeFilter = ({ setTimeRange }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState("");

  const handleTimeRangeChange = (event) => {
    const value = event.target.value;
    setSelectedTimeRange(value);

    const currentTime = (new Date().getTime() / 1000).toFixed(3); // Current time in seconds with milliseconds
    let pastTime;

    switch (value) {
      case "15mins":
        pastTime = (currentTime - 15 * 60).toFixed(3); // Subtract 15 minutes
        break;
      case "30mins":
        pastTime = (currentTime - 30 * 60).toFixed(3); // Subtract 30 minutes
        break;
      case "1hr":
        pastTime = (currentTime - 60 * 60).toFixed(3); // Subtract 1 hour
        break;
      case "2hrs":
        pastTime = (currentTime - 2 * 60 * 60).toFixed(3); // Subtract 2 hours
        break;
      case "1day":
        pastTime = (currentTime - 24 * 60 * 60).toFixed(3); // Subtract 1 day
        break;
      case "2days":
        pastTime = (currentTime - 2 * 24 * 60 * 60).toFixed(3); // Subtract 2 days
        break;
      default:
        pastTime = null;
    }

    // Pass the timestamp to the parent component
    setTimeRange(pastTime);
  };

  return (
    <Box display="flex" alignItems="center" gap={2} mb={2}>
      <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Time Range</InputLabel>
        <Select
          value={selectedTimeRange}
          onChange={handleTimeRangeChange}
          label="Time Range"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          <MenuItem value="15mins">Last 15 mins</MenuItem>
          <MenuItem value="30mins">Last 30 mins</MenuItem>
          <MenuItem value="1hr">Last 1 hour</MenuItem>
          <MenuItem value="2hrs">Last 2 hours</MenuItem>
          <MenuItem value="1day">Last 1 day</MenuItem>
          <MenuItem value="2days">Last 2 days</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
};

export default TimeRangeFilter;
