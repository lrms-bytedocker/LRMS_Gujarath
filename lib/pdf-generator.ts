import { jsPDF } from 'jspdf'
import { PDFDocument } from 'pdf-lib'
import { supabase } from '@/lib/supabase'

interface DocumentInfo {
  type: 'main' | 'year_slab' | 'paiky' | 'ekatrikaran' | 'nondh' | 'relevant'
  url: string
  year?: string | number
  s_no?: string
  title?: string
  order?: number
}

export class IntegratedDocumentGenerator {
  static async generateIntegratedPDF(landRecordId: string, landBasicInfo: any): Promise<void> {
    try {
      console.log('Starting PDF generation for land record:', landRecordId)
      
      // Collect all documents in the required order
      const documents = await this.collectAllDocuments(landRecordId)
      console.log('Collected documents:', documents.length)
      
      if (documents.length === 0) {
        throw new Error('No documents found to integrate')
      }

      // Create new PDF document
      const mergedPdf = await PDFDocument.create()
      
      // Add title page with basic info
      await this.addTitlePage(mergedPdf, landBasicInfo)
      
      // Process each document
      for (const doc of documents) {
        try {
          console.log(`Processing document: ${doc.title}`)
          await this.appendDocumentToPDF(mergedPdf, doc)
        } catch (error) {
          console.warn(`Failed to append document ${doc.title}:`, error)
          // Continue with other documents even if one fails
        }
      }
      
      // Save and download the merged PDF
      const pdfBytes = await mergedPdf.save()
      this.downloadPDF(pdfBytes, `Integrated_Land_Record_${landRecordId}.pdf`)
      
    } catch (error) {
      console.error('Error generating integrated PDF:', error)
      throw error
    }
  }
  
  static async collectAllDocuments(landRecordId: string): Promise<DocumentInfo[]> {
    const documents: DocumentInfo[] = []
    let order = 1
    
    try {
      // 1. Get land basic info document (integrated_712)
      const { data: landRecord, error: landError } = await supabase
        .from('land_records')
        .select('integrated_712')
        .eq('id', landRecordId)
        .single()
        
      if (landError) throw landError
      
      if (landRecord?.integrated_712) {
        documents.push({
          type: 'main',
          url: landRecord.integrated_712,
          title: 'Primary 7/12 Document',
          order: order++
        })
      }
      
      // 2. Get year slabs in descending order with their entries
      const { data: yearSlabs, error: slabsError } = await supabase
        .from('year_slabs')
        .select(`
          id,
          start_year,
          end_year,
          s_no,
          integrated_712,
          paiky,
          ekatrikaran
        `)
        .eq('land_record_id', landRecordId)
        .order('start_year', { ascending: false })
        
      if (slabsError) throw slabsError
      
      if (yearSlabs && yearSlabs.length > 0) {
        // Get all slab entries for these year slabs
        const { data: slabEntries, error: entriesError } = await supabase
          .from('slab_entries')
          .select(`
            year_slab_id,
            entry_type,
            s_no,
            s_no_type,
            integrated_712
          `)
          .in('year_slab_id', yearSlabs.map(s => s.id))
          .order('entry_type', { ascending: true }) // paiky comes before ekatrikaran alphabetically
          
        if (entriesError) throw entriesError
        
        for (const slab of yearSlabs) {
          const paikyEntries = slabEntries?.filter(e => 
            e.year_slab_id === slab.id && e.entry_type === 'paiky'
          ) || []
          
          const ekatrikaranEntries = slabEntries?.filter(e => 
            e.year_slab_id === slab.id && e.entry_type === 'ekatrikaran'
          ) || []
          
          const hasEntries = paikyEntries.length > 0 || ekatrikaranEntries.length > 0
          
          if (hasEntries) {
            // Add paiky entries first
            for (const entry of paikyEntries) {
              if (entry.integrated_712) {
                documents.push({
                  type: 'paiky',
                  url: entry.integrated_712,
                  year: `${slab.start_year}-${slab.end_year}`,
                  s_no: entry.s_no,
                  title: `Paiky Entry - ${slab.start_year}-${slab.end_year} - S.No: ${entry.s_no}`,
                  order: order++
                })
              }
            }
            
            // Then add ekatrikaran entries
            for (const entry of ekatrikaranEntries) {
              if (entry.integrated_712) {
                documents.push({
                  type: 'ekatrikaran',
                  url: entry.integrated_712,
                  year: `${slab.start_year}-${slab.end_year}`,
                  s_no: entry.s_no,
                  title: `Ekatrikaran Entry - ${slab.start_year}-${slab.end_year} - S.No: ${entry.s_no}`,
                  order: order++
                })
              }
            }
          } else {
            // Add main slab document if no entries
            if (slab.integrated_712) {
              documents.push({
                type: 'year_slab',
                url: slab.integrated_712,
                year: `${slab.start_year}-${slab.end_year}`,
                title: `Year Slab - ${slab.start_year}-${slab.end_year}`,
                order: order++
              })
            }
          }
        }
      }
      
      // 3. Get nondh documents in sorted order
      const { data: nondhs, error: nondhsError } = await supabase
        .from('nondhs')
        .select(`
          id,
          number,
          nondh_doc_url
        `)
        .eq('land_record_id', landRecordId)
        .order('number', { ascending: true })
        
      if (nondhsError) throw nondhsError
      
      if (nondhs && nondhs.length > 0) {
        for (const nondh of nondhs) {
          // Add nondh document
          if (nondh.nondh_doc_url) {
            documents.push({
              type: 'nondh',
              url: nondh.nondh_doc_url,
              title: `Nondh #${nondh.number} Document`,
              order: order++
            })
          }
          
          // Check for relevant documents for this nondh
          try {
            const { data: nondhDetails, error: detailsError } = await supabase
              .from('nondh_details')
              .select('doc_upload_url, has_documents')
              .eq('nondh_id', nondh.id)
              .single()
            
            if (!detailsError && nondhDetails?.has_documents && nondhDetails?.doc_upload_url) {
              documents.push({
                type: 'relevant',
                url: nondhDetails.doc_upload_url,
                title: `Relevant Documents - Nondh #${nondh.number}`,
                order: order++
              })
            }
          } catch (error) {
            console.warn(`Failed to fetch relevant docs for nondh ${nondh.number}:`, error)
          }
        }
      }
      
      return documents.sort((a, b) => (a.order || 0) - (b.order || 0))
      
    } catch (error) {
      console.error('Error collecting documents:', error)
      return documents
    }
  }
  
  static async addTitlePage(pdf: PDFDocument, landBasicInfo: any): Promise<void> {
    const page = pdf.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()
    
    const fontSize = 14
    const titleFontSize = 18
    
    // Add title
    page.drawText('Integrated Land Record Document', {
      x: 50,
      y: height - 80,
      size: titleFontSize
    })
    
    // Add land basic information
    let yPosition = height - 150
    const lineHeight = 25
    
    const info = [
      `District: ${landBasicInfo?.district || 'N/A'}`,
      `Taluka: ${landBasicInfo?.taluka || 'N/A'}`,
      `Village: ${landBasicInfo?.village || 'N/A'}`,
      `Survey Number: ${landBasicInfo?.sNo || 'N/A'}`,
      `Survey Type: ${landBasicInfo?.sNoType || 'N/A'}`,
      `Block Number: ${landBasicInfo?.blockNo || 'N/A'}`,
      `Re-survey Number: ${landBasicInfo?.reSurveyNo || 'N/A'}`,
      `Area: ${landBasicInfo?.area?.value || 'N/A'} ${landBasicInfo?.area?.unit || ''}`,
      `Is Promulgation: ${landBasicInfo?.isPromulgation ? 'Yes' : 'No'}`,
      `Generated on: ${new Date().toLocaleDateString()}`
    ]
    
    for (const line of info) {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize
      })
      yPosition -= lineHeight
    }
  }
  
  static async appendDocumentToPDF(pdf: PDFDocument, docInfo: DocumentInfo): Promise<void> {
    try {
      // Fetch the document
      const response = await fetch(docInfo.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      
      // Try to parse as PDF first
      try {
        const sourcePdf = await PDFDocument.load(arrayBuffer)
        const pages = await pdf.copyPages(sourcePdf, sourcePdf.getPageIndices())
        
        // Add a separator page with document info
        const separatorPage = pdf.addPage([595.28, 841.89])
        const { height } = separatorPage.getSize()
        
        separatorPage.drawText(docInfo.title || 'Document', {
          x: 50,
          y: height - 100,
          size: 16
        })
        
        if (docInfo.year) {
          separatorPage.drawText(`Year: ${docInfo.year}`, {
            x: 50,
            y: height - 130,
            size: 12
          })
        }
        
        if (docInfo.s_no) {
          separatorPage.drawText(`S.No: ${docInfo.s_no}`, {
            x: 50,
            y: height - 150,
            size: 12
          })
        }
        
        // Add the actual document pages
        pages.forEach((page) => pdf.addPage(page))
        
      } catch (pdfError) {
        // If not a PDF, try to handle as image
        console.warn('Document is not a PDF, attempting to handle as image:', docInfo.url)
        await this.addImageToPDF(pdf, arrayBuffer, docInfo)
      }
      
    } catch (error) {
      console.error(`Error processing document ${docInfo.title}:`, error)
      // Add an error page instead
      const errorPage = pdf.addPage([595.28, 841.89])
      const { height } = errorPage.getSize()
      
      errorPage.drawText(`Failed to load: ${docInfo.title}`, {
        x: 50,
        y: height - 100,
        size: 16
      })
      
      errorPage.drawText(`URL: ${docInfo.url}`, {
        x: 50,
        y: height - 130,
        size: 10
      })
    }
  }
  
  static async addImageToPDF(pdf: PDFDocument, imageBuffer: ArrayBuffer, docInfo: DocumentInfo): Promise<void> {
    try {
      const page = pdf.addPage([595.28, 841.89])
      const { width, height } = page.getSize()
      
      // Add document title
      page.drawText(docInfo.title || 'Document', {
        x: 50,
        y: height - 50,
        size: 14
      })
      
      // Determine image type and embed
      const uint8Array = new Uint8Array(imageBuffer)
      
      // Check if it's a JPEG or PNG
      let image
      if (this.isJPEG(uint8Array)) {
        image = await pdf.embedJpg(uint8Array)
      } else if (this.isPNG(uint8Array)) {
        image = await pdf.embedPng(uint8Array)
      } else {
        throw new Error('Unsupported image format')
      }
      
      // Calculate dimensions to fit page
      const maxWidth = width - 100
      const maxHeight = height - 150
      
      const { width: imgWidth, height: imgHeight } = image.scale(1)
      const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)
      
      page.drawImage(image, {
        x: 50,
        y: 100,
        width: imgWidth * scale,
        height: imgHeight * scale
      })
      
    } catch (error) {
      console.error('Error adding image to PDF:', error)
      throw error
    }
  }
  
  static isJPEG(bytes: Uint8Array): boolean {
    return bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xD8
  }
  
  static isPNG(bytes: Uint8Array): boolean {
    return bytes.length >= 8 && 
           bytes[0] === 0x89 && bytes[1] === 0x50 && 
           bytes[2] === 0x4E && bytes[3] === 0x47
  }
  
  static downloadPDF(pdfBytes: Uint8Array, filename: string): void {
    // Convert Uint8Array to ArrayBuffer to fix TypeScript compatibility
    const buffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength)
    const blob = new Blob([buffer], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(url)
  }
}