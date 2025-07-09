// Test Supabase Connection
// Run with: node test-supabase.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  });
  
  return env;
}

async function testSupabase() {
  console.log('🔍 Testing Supabase connection...\n');
  
  // Load environment variables
  const env = loadEnvFile();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment Variables:');
  console.log('URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.log('Key:', supabaseKey ? `✅ Found (${supabaseKey.length} chars)` : '❌ Missing');
  console.log('Key Preview:', supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'None');
  console.log('');
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing environment variables. Please check your .env.local file.');
    return;
  }
  
  try {
    // Create client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created successfully');
    
    // Test connection by querying learned_patterns
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('learned_patterns')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Database error:', error.message);
      if (error.message.includes('relation "learned_patterns" does not exist')) {
        console.log('\n💡 You need to create the database tables!');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the SQL from setup-database.sql');
      }
    } else {
      console.log('✅ Database connection successful!');
      console.log(`📊 Found ${data.length} patterns in database`);
    }
    
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
  }
}

testSupabase(); 