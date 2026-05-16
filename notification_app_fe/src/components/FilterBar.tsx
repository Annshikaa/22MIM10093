import React from 'react';
import { Box, Chip } from '@mui/material';

const TYPES = ['All', 'Placement', 'Result', 'Event'] as const;
type FilterType = typeof TYPES[number];

interface Props {
  selected: string;
  onChange: (type: string) => void;
}

const FilterBar: React.FC<Props> = ({ selected, onChange }) => {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      {TYPES.map((t) => {
        const isActive = selected === t || (t === 'All' && !selected);
        return (
          <Chip
            key={t}
            label={t}
            clickable
            color={isActive ? 'primary' : 'default'}
            variant={isActive ? 'filled' : 'outlined'}
            onClick={() => onChange(t === 'All' ? '' : t)}
          />
        );
      })}
    </Box>
  );
};

export default FilterBar;
