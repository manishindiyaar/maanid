// import { NextRequest, NextResponse } from "next/server";
// import generateGeminiEmbedding, { generateSimpleEmbedding } from "@/lib/ai/utils/gemini-embeddings";

// export async function GET(request: NextRequest) {
//   try {
//     // Get the test text from query params or use a default
//     const { searchParams } = new URL(request.url);
//     const text = searchParams.get("text") || "This is a test text for embedding generation.";
    
//     console.log(`Generating embedding for test text: "${text}"`);
    
//     // Try to generate embeddings with Gemini
//     let embeddingResult;
//     let usingFallback = false;
    
//     try {
//       embeddingResult = await generateGeminiEmbedding(text);
//       console.log(`Generated Gemini embedding with ${embeddingResult.length} dimensions`);
//     } catch (error) {
//       console.error("Gemini embedding failed, using fallback:", error);
//       embeddingResult = generateSimpleEmbedding(text);
//       usingFallback = true;
//       console.log(`Generated fallback embedding with ${embeddingResult.length} dimensions`);
//     }
    
//     // Return a subset of the embedding to avoid large response
//     const embeddingPreview = embeddingResult.slice(0, 10);
    
//     return NextResponse.json({
//       status: "success",
//       usingFallback,
//       text,
//       embeddingLength: embeddingResult.length,
//       embeddingPreview,
//       apiKeyConfigured: !!process.env.GEMINI_API_KEY
//     });
    
//   } catch (error) {
//     console.error("Error in test-embedding route:", error);
//     return NextResponse.json({
//       status: "error", 
//       message: error instanceof Error ? error.message : "Unknown error",
//       apiKeyConfigured: !!process.env.GEMINI_API_KEY
//     }, { status: 500 });
//   }
// } 