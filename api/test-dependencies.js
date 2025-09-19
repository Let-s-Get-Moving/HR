// Quick dependency test
console.log('🧪 Testing dependencies...');

try {
  // Test DOMPurify
  import { JSDOM } from 'jsdom';
  import createDOMPurify from 'dompurify';
  
  const window = new JSDOM('').window;
  const DOMPurify = createDOMPurify(window);
  
  const testString = '<script>alert("xss")</script>Hello World';
  const sanitized = DOMPurify.sanitize(testString);
  
  console.log('✅ DOMPurify working:', sanitized);
  
  // Test other imports
  import rateLimit from 'express-rate-limit';
  import helmet from 'helmet';
  
  console.log('✅ express-rate-limit available');
  console.log('✅ helmet available');
  
  console.log('🎉 All dependencies working correctly!');
  
} catch (error) {
  console.log('❌ Dependency error:', error.message);
}
