import React, { useState, useEffect } from 'react';
import { Facebook, Instagram, Linkedin, Upload, Wand2, Send, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generatePostContent, generateImageDescription, generateImageUrl, CONTENT_CATEGORIES } from '../api/gemini';
import { publishToFacebook } from '../api/facebook';
import { publishToInstagram } from '../api/instagram';
import { publishToLinkedIn } from '../api/linkedin';
import { createAutomaticFacebookAd } from '../api/facebookAds';
import { saveGeneratedContent } from '../firebase/content';
import { useAuth } from '../Contexts/AuthContext';
import { getCredential, getCredentials } from '../firebase/firestore';

interface FacebookContentProps {
  platform: 'facebook' | 'instagram' | 'linkedin';
}

interface Credentials {
  facebook?: {
    pageAccessToken: string;
    pageId: string;
  };
  instagram?: {
    userAccessToken: string;
    businessAccountId: string;
  };
  linkedin?: {
    accessToken: string;
    userId: string;
  };
  facebookAds?: {
    accessToken: string;
    adAccountId: string;
    campaignId: string;
  };
}

export default function FacebookContent({ platform }: FacebookContentProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [storedCredentials, setStoredCredentials] = useState<any>({});
  const [hasCredentials, setHasCredentials] = useState(false);

  // Platform-specific configurations
  const platformConfig = {
    facebook: {
      icon: Facebook,
      name: 'Facebook',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      buttonText: 'Publish to Facebook',
      credentialType: 'Facebook Page'
    },
    instagram: {
      icon: Instagram,
      name: 'Instagram',
      color: 'from-purple-500 via-pink-500 to-orange-400',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50',
      textColor: 'text-purple-600',
      buttonText: 'Publish to Instagram',
      credentialType: 'Instagram Business Account'
    },
    linkedin: {
      icon: Linkedin,
      name: 'LinkedIn',
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      buttonText: 'Publish to LinkedIn',
      credentialType: 'LinkedIn Profile'
    }
  };

  const config = platformConfig[platform];
  const IconComponent = config.icon;

  useEffect(() => {
    loadAllCredentials();
  }, [currentUser, platform]);

  const loadAllCredentials = async () => {
    if (!currentUser) return;

    try {
      const { success, data } = await getCredentials(currentUser.uid);
      if (success && data) {
        const credentialsMap: any = {};
        data.forEach((cred: any) => {
          credentialsMap[cred.type] = cred;
        });
        setStoredCredentials(credentialsMap);
        
        // Check if current platform has credentials
        const hasPlatformCreds = !!credentialsMap[platform];
        setHasCredentials(hasPlatformCreds);
      } else {
        setHasCredentials(false);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
      setHasCredentials(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setPublishStatus('idle');
    
    try {
      // Generate post content
      const content = await generatePostContent(prompt, 'General');
      setGeneratedContent(content);
      
      // Generate image description and then image URL
      const imageDescription = await generateImageDescription(prompt, 'General');
      const imageUrl = await generateImageUrl(imageDescription);
      setGeneratedImage(imageUrl);
    } catch (error) {
      console.error('Error generating content:', error);
      setStatusMessage('Failed to generate content. Please try again.');
      setPublishStatus('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!generatedContent || !hasCredentials) return;

    setIsPublishing(true);
    setPublishStatus('idle');

    try {
      let result;
      
      switch (platform) {
        case 'facebook':
          const facebookCreds = storedCredentials.facebook;
          if (!facebookCreds) {
            throw new Error('Facebook credentials not found');
          }
          result = await publishToFacebook(
            generatedContent,
            generatedImage,
            facebookCreds.pageId,
            facebookCreds.accessToken
          );
          
          // Create Facebook ad if ads credentials exist and post was successful
          const facebookAdsCreds = storedCredentials.facebook_ads;
          if (facebookAdsCreds && result.success && result.postId) {
            try {
              await createAutomaticFacebookAd(
                result.postId,
                generatedImage,
                generatedContent
              );
              setStatusMessage('Published to Facebook and ad created successfully!');
            } catch (adError) {
              console.error('Ad creation failed:', adError);
              setStatusMessage('Published to Facebook successfully, but ad creation failed.');
            }
          } else {
            setStatusMessage('Published to Facebook successfully!');
          }
          break;

        case 'instagram':
          const instagramCreds = storedCredentials.instagram;
          if (!instagramCreds) {
            throw new Error('Instagram credentials not found');
          }
          result = await publishToInstagram(
            generatedContent,
            generatedImage,
            instagramCreds.instagramUserId,
            instagramCreds.accessToken
          );
          setStatusMessage('Published to Instagram successfully!');
          break;

        case 'linkedin':
          const linkedInCreds = storedCredentials.linkedin;
          if (!linkedInCreds) {
            throw new Error('LinkedIn credentials not found');
          }
          result = await publishToLinkedIn(generatedContent, linkedInCreds.linkedInUserId, linkedInCreds.accessToken);
          setStatusMessage('Published to LinkedIn successfully!');
          break;

        default:
          throw new Error('Unsupported platform');
      }

      if (result.success) {
        setPublishStatus('success');
        
        // Save to Firestore
        if (currentUser) {
          await saveGeneratedContent(currentUser.uid, {
            generatedContent,
            generatedImageUrl: generatedImage,
            imageDescription: '',
            category: 'General',
            prompt,
            status: 'published',
            postId: result.postId || result.mediaId,
            platform
          });
        }
      } else {
        throw new Error(result.error || 'Publishing failed');
      }
    } catch (error) {
      console.error('Publishing error:', error);
      setStatusMessage(`Failed to publish to ${config.name}. Please check your credentials and try again.`);
      setPublishStatus('error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Back Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors mr-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Header */}
        <div className={`${config.bgColor} rounded-lg p-6 mb-8`}>
          <div className="flex items-center space-x-3 mb-4">
            <div className={`p-3 bg-gradient-to-r ${config.color} rounded-lg`}>
              <IconComponent className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {config.name} Content Creator
              </h1>
              <p className="text-gray-600">
                Generate and publish content to your {config.credentialType}
              </p>
            </div>
          </div>

          {!hasCredentials && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <p className="text-yellow-800">
                  Please add your {config.name} credentials in the Credential Vault to publish content.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content Generation */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generate Content
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Describe the content you want to create for ${config.name}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={`w-full bg-gradient-to-r ${config.color} text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>Generate Content</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Generated Content Preview
            </h2>
            
            <div className="space-y-4">
              {generatedImage && (
                <div className="relative">
                  <img
                    src={generatedImage}
                    alt="Generated content"
                    className="w-full max-w-md mx-auto rounded-lg shadow-sm"
                  />
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {generatedContent}
                </p>
              </div>

              {hasCredentials && (
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className={`w-full bg-gradient-to-r ${config.color} text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{config.buttonText}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {publishStatus !== 'idle' && (
          <div className={`rounded-lg p-4 mb-6 ${
            publishStatus === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {publishStatus === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600" />
              )}
              <p className={publishStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
                {statusMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}