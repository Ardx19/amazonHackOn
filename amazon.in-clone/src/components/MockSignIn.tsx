import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { UserSession } from '../types';

interface MockSignInProps {
  onClose: () => void;
  onLoginSuccess: (name: string, email: string) => void;
}

export default function MockSignIn({ onClose, onLoginSuccess }: MockSignInProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errorInput, setErrorInput] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInput('');

    if (!email.trim() || !password.trim()) {
      setErrorInput('Please fill in both your email/phone and password fields.');
      return;
    }

    if (isRegistering && !name.trim()) {
      setErrorInput('Please enter your name.');
      return;
    }

    // Capture user details or mock realistic ones
    let clientName = name.trim() || email.split('@')[0];
    // Capitalize first letter
    clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1);
    
    onLoginSuccess(clientName, email.trim());
    onClose();
  };

  const handleDemoLogin = (choice: 'ishaan' | 'priya') => {
    if (choice === 'ishaan') {
      onLoginSuccess('Ishaan', 'ishaan@amazon.in');
    } else {
      onLoginSuccess('Priya', 'priya@gmail.com');
    }
    onClose();
  };

  return (
    <div id="signin-modal-container" className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-white rounded max-w-md w-full p-8 shadow-2xl relative border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Absolute exit button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors p-1"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Amazon.in Centered Logo representation */}
        <div className="flex flex-col items-center justify-center mb-6">
          <span className="text-2xl font-bold tracking-tight text-gray-900 leading-none">
            amazon<span className="text-amzn-orange font-medium text-lg">.in</span>
          </span>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Secure simulated login</p>
        </div>

        {/* Dynamic header title */}
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 tracking-tight">
          {isRegistering ? 'Create Account' : 'Sign in'}
        </h3>

        {/* Feedback errors */}
        {errorInput && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 flex items-start gap-2.5 text-xs text-red-700 font-medium leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{errorInput}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {isRegistering && (
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">Your name</label>
              <input
                type="text"
                placeholder="First and last name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-400 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-800 mb-1">
              Email or mobile phone number
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ishaanraj3219@gmail.com"
              className="w-full border border-gray-400 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-800">Password</label>
              {!isRegistering && (
                <span className="text-[10px] text-amzn-blue hover:text-amzn-orange hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              )}
            </div>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-400 focus:border-amzn-orange focus:ring-1 focus:ring-amzn-orange rounded px-3 py-1.5 text-xs outline-none text-gray-900 font-sans"
            />
          </div>

          {/* Amazon.in Orange sign in / register trigger */}
          <button
            type="submit"
            className="w-full text-center bg-amzn-yellow hover:bg-amzn-orange text-gray-900 border border-amber-600/30 rounded py-1.5 text-xs font-bold shadow-xs cursor-pointer transition-colors"
          >
            {isRegistering ? 'Register as New Customer' : 'Continue'}
          </button>

          {/* Legal Conditions */}
          <p className="text-[10px] text-gray-600 leading-normal font-normal">
            By continuing, you agree to Amazon's{' '}
            <span className="text-amzn-blue hover:underline cursor-pointer">Conditions of Use</span> and{' '}
            <span className="text-amzn-blue hover:underline cursor-pointer">Privacy Notice</span>.
          </p>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-bold uppercase">Or use demo profiling</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('ishaan')}
              className="border p-2 rounded text-[10px] hover:bg-gray-50 text-left font-semibold text-gray-700"
            >
              Sign as <span className="text-orange-600">Ishaan Raj</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('priya')}
              className="border p-2 rounded text-[10px] hover:bg-gray-50 text-left font-semibold text-gray-700"
            >
              Sign as <span className="text-orange-600">Priya Sharma</span>
            </button>
          </div>

          {/* Toggle Button */}
          <div className="border-t pt-4 text-center">
            <p className="text-xs text-gray-600">
              {isRegistering ? 'Already have an account?' : 'New to Amazon?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorInput('');
              }}
              className="mt-2 w-full text-center bg-gray-100 hover:bg-gray-200 border rounded py-1 text-xs font-semibold text-gray-800 transition-colors cursor-pointer"
            >
              {isRegistering ? 'Sign in now' : 'Create your Amazon account'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
