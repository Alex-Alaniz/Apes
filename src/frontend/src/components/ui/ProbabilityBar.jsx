import React from 'react';
import { motion } from 'framer-motion';

const ProbabilityBar = ({ probability, color = '#6366F1', animated = false }) => {
  return (
    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${probability}%` }}
        transition={{
          duration: animated ? 1.5 : 0.5,
          ease: "easeOut"
        }}
      >
        {/* Shimmer effect for animated bars */}
        {animated && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
          />
        )}
      </motion.div>
      
      {/* Pulse effect for high probability */}
      {probability > 70 && animated && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        />
      )}
    </div>
  );
};

export default ProbabilityBar; 