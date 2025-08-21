@@ .. @@
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

-interface Credentials {
-  facebook?: {
-    pageAccessToken: string;
-    pageId: string;
-  };
-  instagram?: {
-    userAccessToken: string;
-    businessAccountId: string;
-  };
-  linkedin?: {
-    accessToken: string;
-    userId: string;
-  };
-  facebookAds?: {
-    accessToken: string;
-    adAccountId: string;
-    campaignId: string;
-  };
-}
-
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
+  const [isLoadingCredentials, setIsLoadingCredentials] = useState(true);

   // Platform-specific configurations
   const platformConfig = {
@@ .. @@
   useEffect(() => {
     loadAllCredentials();
   }, [currentUser, platform]);

   const loadAllCredentials = async () => {
     if (!currentUser) return;

+    setIsLoadingCredentials(true);
     try {
       const { success, data } = await getCredentials(currentUser.uid);
+      console.log('Loading credentials for platform:', platform);
+      console.log('Credentials fetch result:', { success, data });
+      
       if (success && data) {
         const credentialsMap: any = {};
         data.forEach((cred: any) => {
           credentialsMap[cred.type] = cred;
         });
+        
+        console.log('Credentials map:', credentialsMap);
         setStoredCredentials(credentialsMap);
         
         // Check if current platform has credentials
         const hasPlatformCreds = !!credentialsMap[platform];
+        console.log(`Has ${platform} credentials:`, hasPlatformCreds);
+        
+        // For Facebook, also check if we have the required fields
+        if (platform === 'facebook' && credentialsMap.facebook) {
+          const fbCreds = credentialsMap.facebook;
+          const hasRequiredFields = fbCreds.accessToken && fbCreds.pageId;
+          console.log('Facebook credentials validation:', {
+            hasAccessToken: !!fbCreds.accessToken,
+            hasPageId: !!fbCreds.pageId,
+            hasRequiredFields
+          });
+          setHasCredentials(hasRequiredFields);
+        } else {
+          setHasCredentials(hasPlatformCreds);
+        }
-        setHasCredentials(hasPlatformCreds);
       } else {
+        console.log('No credentials found or fetch failed');
         setHasCredentials(false);
+        setStoredCredentials({});
       }
     } catch (error) {
       console.error('Error loading credentials:', error);
       setHasCredentials(false);
+      setStoredCredentials({});
+    } finally {
+      setIsLoadingCredentials(false);
     }
   };

@@ .. @@
   const handlePublish = async () => {
     if (!generatedContent || !hasCredentials) return;

     setIsPublishing(true);
     setPublishStatus('idle');
+    setStatusMessage('');

     try {
       let result;
       
       switch (platform) {
         case 'facebook':
           const facebookCreds = storedCredentials.facebook;
           if (!facebookCreds) {
             throw new Error('Facebook credentials not found');
           }
+          
+          console.log('Publishing to Facebook with credentials:', {
+            hasAccessToken: !!facebookCreds.accessToken,
+            hasPageId: !!facebookCreds.pageId,
+            pageId: facebookCreds.pageId
+          });
+          
           result = await publishToFacebook(
             generatedContent,
             generatedImage,
             facebookCreds.pageId,
             facebookCreds.accessToken
           );
           
+          console.log('Facebook publish result:', result);
+          
           // Create Facebook ad if ads credentials exist and post was successful
           const facebookAdsCreds = storedCredentials.facebook_ads;
           if (facebookAdsCreds && result.success && result.postId) {
             try {
+              console.log('Creating Facebook ad for post:', result.postId);
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

@@ .. @@
           </div>

-          {!hasCredentials && (
+          {isLoadingCredentials ? (
+            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
+              <div className="flex items-center space-x-2">
+                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
+                <p className="text-blue-800">
+                  Loading {config.name} credentials...
+                </p>
+              </div>
+            </div>
+          ) : !hasCredentials ? (
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
               <div className="flex items-center space-x-2">
                 <AlertCircle className="w-5 h-5 text-yellow-600" />
                 <p className="text-yellow-800">
                   Please add your {config.name} credentials in the Credential Vault to publish content.
                 </p>
               </div>
             </div>
+          ) : (
+            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
+              <div className="flex items-center space-x-2">
+                <CheckCircle className="w-5 h-5 text-green-600" />
+                <p className="text-green-800">
+                  {config.name} credentials loaded successfully. Ready to publish!
+                </p>
+              </div>
+            </div>
           )}
         </div>

@@ .. @@
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
+              
+              {!hasCredentials && !isLoadingCredentials && (
+                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
+                  <div className="flex items-center space-x-2">
+                    <AlertCircle className="w-5 h-5 text-yellow-600" />
+                    <p className="text-yellow-800">
+                      Add your {config.name} credentials in the Credential Vault to enable publishing.
+                    </p>
+                  </div>
+                  <button
+                    onClick={() => navigate('/credential-vault')}
+                    className="mt-2 text-yellow-700 underline hover:text-yellow-900 transition-colors"
+                  >
+                    Go to Credential Vault
+                  </button>
+                </div>
+              )}
             </div>
           </div>
         )}