@@ .. @@
 // Publish content to Facebook with enhanced error handling
 export async function publishToFacebook(
   content: string,
   imageUrl: string,
   pageId: string,
   accessToken: string
 ): Promise<{ success: boolean; postId?: string; error?: string }> {
   try {
+    console.log('Publishing to Facebook:', {
+      hasContent: !!content,
+      hasImageUrl: !!imageUrl,
+      hasPageId: !!pageId,
+      hasAccessToken: !!accessToken,
+      pageId: pageId
+    });
+    
     // First validate credentials
     const validation = await validateFacebookCredentials(accessToken, pageId);
     if (!validation.success) {
+      console.error('Facebook credential validation failed:', validation.error);
       return {
         success: false,
         error: validation.error
       };
     }

+    console.log('Facebook credentials validated successfully');
+    
     // Use the page's access token if available
     const pageAccessToken = validation.pageInfo?.access_token || accessToken;

+    console.log('Publishing Facebook post with page access token');
+    
     // Publish the post with image
     const response = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         url: imageUrl,
         caption: content,
         access_token: pageAccessToken
       })
     });

     const result = await response.json();
+    console.log('Facebook API response:', { status: response.status, result });

     if (!response.ok) {
+      console.error('Facebook publishing failed:', result);
       return {
         success: false,
         error: result.error?.message || 'Failed to publish to Facebook'
       };
     }

+    console.log('Facebook post published successfully:', result.id);
     return {
       success: true,
       postId: result.id
     };

   } catch (error: any) {
+    console.error('Facebook publishing error:', error);
     return {
       success: false,
       error: error.message || 'Network error while publishing to Facebook'
     };
   }
 }