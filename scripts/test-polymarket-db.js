#!/usr/bin/env node

const { Pool } = require('pg');

// Direct connection using provided credentials
const POLYMARKET_DB_URL = 'postgresql://neondb_owner:npg_qht1Er7SFAIn@ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech/neondb?sslmode=require';

class PolymarketDBExplorer {
  constructor() {
    this.pool = new Pool({
      connectionString: POLYMARKET_DB_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async exploreTables() {
    console.log('🔍 Exploring Polymarket Database Schema...\n');
    
    try {
      // List all tables
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      
      const tablesResult = await this.pool.query(tablesQuery);
      console.log('📊 Tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      // Look for market-related tables
      const marketTables = tablesResult.rows.filter(row => 
        row.table_name.toLowerCase().includes('market') ||
        row.table_name.toLowerCase().includes('event') ||
        row.table_name.toLowerCase().includes('option')
      );
      
      if (marketTables.length > 0) {
        console.log('\n🎯 Market-related tables:');
        for (const table of marketTables) {
          await this.exploreTableSchema(table.table_name);
        }
      }
      
      // Sample data from promising tables
      console.log('\n📈 Looking for markets with ApeChain IDs...');
      await this.findApeChainMarkets();
      
    } catch (error) {
      console.error('❌ Database error:', error.message);
    }
  }

  async exploreTableSchema(tableName) {
    console.log(`\n📋 Schema for ${tableName}:`);
    
    const schemaQuery = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `;
    
    try {
      const result = await this.pool.query(schemaQuery, [tableName]);
      result.rows.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
      });
      
      // Get row count
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
      const countResult = await this.pool.query(countQuery);
      console.log(`   Total rows: ${countResult.rows[0].count}`);
      
    } catch (error) {
      console.error(`   Error exploring ${tableName}:`, error.message);
    }
  }

  async findApeChainMarkets() {
    // Try different table/column combinations
    const queries = [
      {
        name: 'markets table with apechain_market_id',
        query: `
          SELECT * FROM markets 
          WHERE apechain_market_id IS NOT NULL 
          LIMIT 5
        `
      },
      {
        name: 'events table with chain reference',
        query: `
          SELECT * FROM events 
          WHERE chain = 'apechain' OR chain_id IS NOT NULL
          LIMIT 5
        `
      },
      {
        name: 'any table with apechain in name',
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_name ILIKE '%apechain%'
        `
      }
    ];
    
    for (const { name, query } of queries) {
      console.log(`\n🔎 Trying: ${name}`);
      try {
        const result = await this.pool.query(query);
        if (result.rows.length > 0) {
          console.log(`✅ Found ${result.rows.length} records!`);
          console.log('Sample:', JSON.stringify(result.rows[0], null, 2));
        } else {
          console.log('❌ No records found');
        }
      } catch (error) {
        console.log(`⚠️  Query failed: ${error.message}`);
      }
    }
  }

  async searchForMarketData() {
    console.log('\n🔍 Searching for market data across all tables...');
    
    // Get all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tables = await this.pool.query(tablesQuery);
    
    for (const { table_name } of tables.rows) {
      try {
        // Check if table has relevant columns
        const columnsQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 
          AND (
            column_name ILIKE '%question%' OR
            column_name ILIKE '%title%' OR
            column_name ILIKE '%market%' OR
            column_name ILIKE '%event%' OR
            column_name ILIKE '%option%' OR
            column_name ILIKE '%apechain%' OR
            column_name ILIKE '%chain%'
          )
        `;
        
        const columns = await this.pool.query(columnsQuery, [table_name]);
        
        if (columns.rows.length > 0) {
          console.log(`\n📊 Table: ${table_name}`);
          console.log('   Relevant columns:', columns.rows.map(r => r.column_name).join(', '));
          
          // Sample first row
          const sampleQuery = `SELECT * FROM ${table_name} LIMIT 1`;
          const sample = await this.pool.query(sampleQuery);
          if (sample.rows.length > 0) {
            console.log('   Sample row:', JSON.stringify(sample.rows[0], null, 2).substring(0, 500) + '...');
          }
        }
      } catch (error) {
        // Skip errors for system tables
      }
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Main execution
async function main() {
  const explorer = new PolymarketDBExplorer();
  
  try {
    console.log('🚀 Connecting to Polymarket Database...');
    console.log(`   Host: ep-proud-snow-a4l83fqg.us-east-1.aws.neon.tech`);
    console.log(`   Database: neondb`);
    console.log(`   User: neondb_owner\n`);
    
    await explorer.exploreTables();
    await explorer.searchForMarketData();
    
    console.log('\n✨ Exploration complete!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await explorer.close();
  }
}

main().catch(console.error); 