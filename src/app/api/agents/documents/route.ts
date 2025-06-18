// import { NextRequest, NextResponse } from "next/server";
// import { supabase } from "@/lib/supabase/server";
// import generateGeminiEmbedding, { generateSimpleEmbedding } from "@/lib/ai/utils/gemini-embeddings";
// import pdfParse from 'pdf-parse';
// import { writeFile, unlink, mkdir } from "fs/promises";
// import { join } from "path";
// import { existsSync } from "fs";
// import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// export async function OPTIONS() {
//   return NextResponse.json({}, { headers: corsHeaders });
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const agentId = searchParams.get("agent_id");

//     if (!agentId) {
//       return NextResponse.json(
//         { error: "Agent ID is required" },
//         { status: 400, headers: corsHeaders }
//       );
//     }

//     const { data, error } = await supabase
//       .from("agent_documents")
//       .select("id, agent_id, filename, tag, created_at")
//       .eq("agent_id", agentId);

//     if (error) {
//       console.error("Error fetching documents:", error);
//       return NextResponse.json(
//         { error: "Failed to fetch documents" },
//         { status: 500, headers: corsHeaders }
//       );
//     }

//     return NextResponse.json(data, { headers: corsHeaders });
//   } catch (error) {
//     console.error("Error in GET handler:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }

// export async function POST(request: NextRequest) {
//   try {
//     const formData = await request.formData();
//     const file = formData.get('file') as File;
//     const agentId = formData.get('agent_id') as string;
//     const tag = formData.get('tag') as string || '';

//     if (!file || !agentId) {
//       return NextResponse.json(
//         { error: 'File and agent_id are required' },
//         { status: 400, headers: corsHeaders }
//       );
//     }

//     console.log(`Processing file ${file.name} for agent ${agentId} with tag ${tag}`);

//     // Get file content as buffer
//     const buffer = Buffer.from(await file.arrayBuffer());
//     const filename = file.name;
    
//     // Create temp directory if it doesn't exist
//     const tmpDir = join(process.cwd(), 'tmp');
//     if (!existsSync(tmpDir)) {
//       await mkdir(tmpDir, { recursive: true });
//     }
    
//     // Save file temporarily to extract text
//     const tempFilePath = join(tmpDir, `${uuidv4()}-${filename}`);
//     await writeFile(tempFilePath, buffer);
    
//     try {
//       // Extract text from PDF
//       console.log(`Extracting text from PDF ${filename}`);
//       const pdfData = await pdfParse(buffer);
//       const text = pdfData.text || '';
//       console.log(`Extracted ${text.length} characters from PDF`);
      
//       // Generate embeddings for the text
//       console.log(`Generating embeddings for ${filename}`);
//       let vector: number[] = [];
//       let embeddingSource = "gemini";
      
//       // Only attempt embedding if we have text content
//       if (text.length > 0) {
//         try {
//           // Try using Gemini for embeddings
//           vector = await generateGeminiEmbedding(text);
//           console.log(`Successfully generated ${vector.length}-dimensional embedding with Gemini`);
//         } catch (embeddingError) {
//           console.error("Error generating Gemini embedding, falling back to simple embedding:", embeddingError);
//           // Fall back to simple embedding method if Gemini fails
//           embeddingSource = "simple-fallback";
//           try {
//             vector = generateSimpleEmbedding(text);
//             console.log(`Generated fallback ${vector.length}-dimensional simple embedding`);
//           } catch (fallbackError) {
//             console.error("Simple embedding also failed:", fallbackError);
//             embeddingSource = "zero-vector";
//           }
//         }
//       } else {
//         console.log("No text content extracted, using zero vector");
//         embeddingSource = "zero-vector-empty-text";
//       }
      
//       // Make sure we have a valid vector (768 dimensions)
//       if (!vector || !Array.isArray(vector) || vector.length !== 768) {
//         console.log(`Invalid vector dimensions: ${vector?.length || 0}, creating zero vector`);
//         vector = new Array(768).fill(0);
//         if (embeddingSource === "gemini") {
//           embeddingSource = "zero-vector-invalid-gemini";
//         }
//       }
      
//       // Ensure all vector values are valid numbers
//       const sanitizedVector = vector.map(val => {
//         if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
//           return 0;
//         }
//         return val;
//       });
      
//       // Insert document with embedding vector
//       const documentData = {
//         agent_id: agentId,
//         filename: filename,
//         tag: tag,
//         content: text || buffer.toString('base64'), // Store the extracted text or base64 as fallback
//         vector: sanitizedVector,
//         metadata: {
//           fileSize: file.size,
//           fileType: file.type,
//           textLength: text.length,
//           pageCount: pdfData.numpages || 0,
//           embedding: {
//             source: embeddingSource,
//             dimensions: sanitizedVector.length
//           }
//         }
//       };
      
//       console.log(`Inserting document for agent ${agentId} with ${vector.length}-dimensional vector`);
//       const { data, error } = await supabase
//         .from('agent_documents')
//         .insert(documentData)
//         .select()
//         .single();
        
//       if (error) {
//         console.error("Error inserting document:", error);
//         return NextResponse.json(
//           { error: "Failed to insert document", details: error.message },
//           { status: 500, headers: corsHeaders }
//         );
//       }
      
//       console.log(`Successfully uploaded document ${data.id} for agent ${agentId}`);
//       return NextResponse.json(data, { headers: corsHeaders });
//     } catch (processingError) {
//       console.error("Error processing PDF:", processingError);
      
//       // If PDF processing fails, try a simpler approach without embeddings
//       console.log("Falling back to basic document storage without text extraction");
      
//       // Query table structure
//       const { data: schemaData, error: schemaError } = await supabase
//         .from('agent_documents')
//         .select('*')
//         .limit(1);
      
//       if (schemaError) {
//         console.error("Error querying table schema:", schemaError);
//         return NextResponse.json(
//           { error: "Failed to query table schema", details: schemaError.message },
//           { status: 500, headers: corsHeaders }
//         );
//       }
      
//       // Create a simple fallback vector (all zeros)
//       const fallbackVector = new Array(768).fill(0);
      
//       // Prepare document data
//       const fallbackData = {
//         agent_id: agentId,
//         filename: filename,
//         tag: tag,
//         content: buffer.toString('base64'), // Store as base64 since we couldn't extract text
//         vector: fallbackVector,
//         metadata: {
//           fileSize: file.size,
//           fileType: file.type,
//           embedding: {
//             source: "fallback",
//             dimensions: 768
//           }
//         }
//       };
      
//       const { data, error } = await supabase
//         .from('agent_documents')
//         .insert(fallbackData)
//         .select()
//         .single();
        
//       if (error) {
//         console.error("Error in fallback document upload:", error);
//         return NextResponse.json(
//           { error: "Failed to upload document", details: error.message },
//           { status: 500, headers: corsHeaders }
//         );
//       }
      
//       console.log(`Successfully uploaded document ${data.id} for agent ${agentId} (fallback method)`);
//       return NextResponse.json(data, { headers: corsHeaders });
//     } finally {
//       // Clean up temp file
//       try {
//         await unlink(tempFilePath);
//         console.log(`Removed temporary file ${tempFilePath}`);
//       } catch (cleanupError) {
//         console.error("Error cleaning up temporary file:", cleanupError);
//       }
//     }
//   } catch (error) {
//     console.error("Error in POST handler:", error);
//     return NextResponse.json(
//       { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// }

// export async function DELETE(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const id = searchParams.get("id") || request.url.split('/').pop();

//     if (!id) {
//       return NextResponse.json(
//         { error: "Document ID is required" },
//         { status: 400, headers: corsHeaders }
//       );
//     }

//     console.log(`Attempting to delete document with ID: ${id}`);

//     // First check if the document exists
//     const { data: existingDoc, error: fetchError } = await supabase
//       .from('agent_documents')
//       .select('id, agent_id, filename')
//       .eq('id', id)
//       .single();

//     if (fetchError) {
//       console.error(`Error checking if document ${id} exists:`, fetchError);
      
//       // If the error is that the document is not found, return a 404
//       if (fetchError.code === 'PGRST116') {
//         return NextResponse.json(
//           { error: "Document not found" },
//           { status: 404, headers: corsHeaders }
//         );
//       }
      
//       return NextResponse.json(
//         { error: "Error checking if document exists", details: fetchError.message },
//         { status: 500, headers: corsHeaders }
//       );
//     }

//     // Delete the document directly
//     const { error } = await supabase
//       .from('agent_documents')
//       .delete()
//       .eq('id', id);

//     if (error) {
//       console.error(`Error deleting document ${id}:`, error);
//       return NextResponse.json(
//         { error: "Failed to delete document", details: error.message },
//         { status: 500, headers: corsHeaders }
//       );
//     }

//     console.log(`Successfully deleted document ${id} (${existingDoc.filename}) from agent ${existingDoc.agent_id}`);
//     return NextResponse.json(
//       { success: true, message: "Document deleted successfully" }, 
//       { headers: corsHeaders }
//     );
//   } catch (error) {
//     console.error("Error in DELETE handler:", error);
//     return NextResponse.json(
//       { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
//       { status: 500, headers: corsHeaders }
//     );
//   }
// } 
