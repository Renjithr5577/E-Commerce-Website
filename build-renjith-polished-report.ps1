param(
  [string]$BaseDocPath,
  [string]$OutputPath,
  [switch]$SkipWordVerification,
  [switch]$SkipDownloadsCopy
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

$projectRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

if (-not $BaseDocPath) {
  $preferredBase = Join-Path $projectRoot 'Renjith-source.docx'
  if (Test-Path $preferredBase) {
    $BaseDocPath = $preferredBase
  } else {
    $fallbackBase = Join-Path $projectRoot 'LuxeCart-Project-Submission.docx'
    if (Test-Path $fallbackBase) {
      $BaseDocPath = $fallbackBase
    } else {
      $BaseDocPath = Join-Path $projectRoot 'comp-doc-working-copy.docx'
    }
  }
}

if (-not $OutputPath) {
  $OutputPath = Join-Path $projectRoot 'Renjith-Polished-Project-Report.docx'
}

if (-not (Test-Path $BaseDocPath)) {
  throw "Base report not found: $BaseDocPath"
}

function Escape-XmlText([string]$Text) {
  [System.Security.SecurityElement]::Escape([string]$Text)
}

function New-PageBreakXml {
  '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
}

function New-HeadingXml([string]$Text) {
  $safeText = Escape-XmlText $Text
  "<w:p><w:pPr><w:jc w:val=`"center`"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val=`"30`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function New-SubHeadingXml([string]$Text) {
  $safeText = Escape-XmlText $Text
  "<w:p><w:r><w:rPr><w:b/><w:sz w:val=`"26`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function New-BodyXml([string]$Text) {
  $safeText = Escape-XmlText $Text
  "<w:p><w:r><w:rPr><w:sz w:val=`"24`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function New-BulletXml([string]$Text) {
  $safeText = Escape-XmlText ("- " + $Text)
  "<w:p><w:r><w:rPr><w:sz w:val=`"24`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function New-CodeXml([string]$Text) {
  $safeText = Escape-XmlText $Text
  "<w:p><w:r><w:rPr><w:rFonts w:ascii=`"Consolas`" w:hAnsi=`"Consolas`"/><w:sz w:val=`"16`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function New-CenteredCaptionXml([string]$Text) {
  $safeText = Escape-XmlText $Text
  "<w:p><w:pPr><w:jc w:val=`"center`"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val=`"22`"/></w:rPr><w:t xml:space=`"preserve`">$safeText</w:t></w:r></w:p>"
}

function Add-XmlContent($contentItems, [string]$xml) {
  [void]$contentItems.Add([pscustomobject]@{
      Type  = 'xml'
      Value = $xml
    })
}

function Add-ImageContent($contentItems, [string]$Title, [string]$Description, [string]$Path, [bool]$PageBreakBefore = $true) {
  [void]$contentItems.Add([pscustomobject]@{
      Type            = 'image'
      Title           = $Title
      Description     = $Description
      Path            = $Path
      PageBreakBefore = $PageBreakBefore
    })
}

function Add-Chapter($contentItems, $chapter, [bool]$StartOnNewPage = $true) {
  if ($StartOnNewPage) {
    Add-XmlContent $contentItems (New-PageBreakXml)
  }

  Add-XmlContent $contentItems (New-HeadingXml $chapter.Title)

  foreach ($paragraph in @($chapter.Intro)) {
    if (-not [string]::IsNullOrWhiteSpace($paragraph)) {
      Add-XmlContent $contentItems (New-BodyXml $paragraph)
    }
  }

  foreach ($listItem in @($chapter.ListItems)) {
    if (-not [string]::IsNullOrWhiteSpace($listItem)) {
      Add-XmlContent $contentItems (New-BulletXml $listItem)
    }
  }

  foreach ($subsection in @($chapter.Subsections)) {
    if (-not [string]::IsNullOrWhiteSpace($subsection.Title)) {
      Add-XmlContent $contentItems (New-SubHeadingXml $subsection.Title)
    }

    foreach ($paragraph in @($subsection.Paragraphs)) {
      if (-not [string]::IsNullOrWhiteSpace($paragraph)) {
        Add-XmlContent $contentItems (New-BodyXml $paragraph)
      }
    }

    foreach ($point in @($subsection.Points)) {
      if (-not [string]::IsNullOrWhiteSpace($point)) {
        Add-XmlContent $contentItems (New-BulletXml $point)
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($subsection.Summary)) {
      Add-XmlContent $contentItems (New-BodyXml $subsection.Summary)
    }
  }
}

function Add-CodeListing($contentItems, [string]$Title, [string]$Intro, [string[]]$CodeLines) {
  Add-XmlContent $contentItems (New-PageBreakXml)
  Add-XmlContent $contentItems (New-SubHeadingXml $Title)
  if (-not [string]::IsNullOrWhiteSpace($Intro)) {
    Add-XmlContent $contentItems (New-BodyXml $Intro)
  }
  foreach ($line in $CodeLines) {
    Add-XmlContent $contentItems (New-CodeXml $line)
  }
}

function Get-CodeLines([string]$Path, [int]$StartLine, [int]$EndLine) {
  if (-not (Test-Path $Path)) {
    return @('// File not found.')
  }

  $lines = Get-Content -LiteralPath $Path
  $safeStart = [Math]::Max($StartLine, 1)
  $safeEnd = [Math]::Min($EndLine, $lines.Count)
  $selected = New-Object System.Collections.Generic.List[string]

  for ($index = $safeStart; $index -le $safeEnd; $index++) {
    [void]$selected.Add($lines[$index - 1].Replace("`t", '  '))
  }

  $selected.ToArray()
}

function Get-ParagraphText($paragraphNode, $namespaceManager) {
  (($paragraphNode.SelectNodes('.//w:t', $namespaceManager) | ForEach-Object { $_.'#text' }) -join '').Trim()
}

function Get-NextRelationshipId($relationshipsXml) {
  $maxId = 0
  foreach ($relationship in $relationshipsXml.Relationships.Relationship) {
    if ($relationship.Id -match '^rId(\d+)$') {
      $value = [int]$matches[1]
      if ($value -gt $maxId) {
        $maxId = $value
      }
    }
  }
  'rId' + ($maxId + 1)
}

function Add-ImageToPackage($zip, $relationshipsXml, [string]$imagePath, [string]$entryName) {
  $imageExtension = [IO.Path]::GetExtension($imagePath)
  $mediaName = "$entryName$imageExtension"
  $mediaTarget = "media/$mediaName"
  $mediaEntryPath = "word/$mediaTarget"

  $existingEntry = $zip.GetEntry($mediaEntryPath)
  if ($existingEntry) {
    $existingEntry.Delete()
  }

  $newMediaEntry = $zip.CreateEntry($mediaEntryPath)
  $outputStream = $newMediaEntry.Open()
  $inputStream = [IO.File]::OpenRead($imagePath)
  try {
    $inputStream.CopyTo($outputStream)
  } finally {
    $inputStream.Dispose()
    $outputStream.Dispose()
  }

  $relId = Get-NextRelationshipId -relationshipsXml $relationshipsXml
  $relationship = $relationshipsXml.CreateElement('Relationship', 'http://schemas.openxmlformats.org/package/2006/relationships')
  $null = $relationship.SetAttribute('Id', $relId)
  $null = $relationship.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
  $null = $relationship.SetAttribute('Target', $mediaTarget)
  $null = $relationshipsXml.Relationships.AppendChild($relationship)

  return $relId
}

function Get-ScaledImageEmu([string]$imagePath, [int64]$maxWidthEmu = 5200000, [int64]$maxHeightEmu = 6800000) {
  $image = [System.Drawing.Image]::FromFile($imagePath)
  try {
    $widthEmu = [int64]([Math]::Round($image.Width * 9525))
    $heightEmu = [int64]([Math]::Round($image.Height * 9525))
  } finally {
    $image.Dispose()
  }

  $scale = [Math]::Min($maxWidthEmu / [double]$widthEmu, $maxHeightEmu / [double]$heightEmu)
  $scale = [Math]::Min($scale, 1.0)

  @{
    Width  = [int64]([Math]::Round($widthEmu * $scale))
    Height = [int64]([Math]::Round($heightEmu * $scale))
  }
}

function New-ImageParagraphXml([string]$relationshipId, [string]$name, [int64]$widthEmu, [int64]$heightEmu, [int]$docPrId) {
  $safeName = Escape-XmlText $name
  @"
<w:p>
  <w:pPr><w:jc w:val="center"/></w:pPr>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <wp:extent cx="$widthEmu" cy="$heightEmu"/>
        <wp:docPr id="$docPrId" name="$safeName"/>
        <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="0" name="$safeName"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="$relationshipId"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="$widthEmu" cy="$heightEmu"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>
"@
}

$processorName = try { (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name) } catch { 'Intel Core i5 Processor' }
$ramGb = try { [Math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2) } catch { 8 }
$osCaption = try { (Get-CimInstance Win32_OperatingSystem).Caption } catch { 'Microsoft Windows 11' }

$contentItems = New-Object System.Collections.Generic.List[object]
$chapters = @()

$contentsEntries = @(
  '1. SYNOPSIS',
  '2. INTRODUCTION',
  '   2.1 Project Profile',
  '   2.2 Objectives of the Project',
  '   2.3 Scope of the Project',
  '   2.4 Web Application Implementation',
  '   2.5 Web Application Protection',
  '   2.6 Project Profile',
  '3. SYSTEM ANALYSIS',
  '4. SYSTEM REQUIREMENTS',
  '5. PROJECT DESCRIPTION',
  '6. SYSTEM DESIGN',
  '7. SYSTEM TESTING',
  '8. SYSTEM IMPLEMENTATION',
  '9. SOURCE CODE',
  '10. SAMPLE OUTPUT',
  '11. CONCLUSION',
  '12. FUTURE ENHANCEMENT',
  '13. BIBLIOGRAPHY'
)

Add-XmlContent $contentItems (New-PageBreakXml)
Add-XmlContent $contentItems (New-HeadingXml 'CONTENTS')
foreach ($line in $contentsEntries) {
  Add-XmlContent $contentItems (New-BodyXml $line)
}

$chapters += @(
  @{
    Title      = '1. SYNOPSIS'
    Intro      = @(
      'LuxeCart E-Commerce Website is a full-stack online shopping application developed to demonstrate a complete customer sales flow together with a practical administrative management flow. The system supports product discovery, category browsing, product detail viewing, cart handling, checkout, order confirmation, order history, customer account management, and support ticket creation.',
      'The project is implemented using Angular and TypeScript for the frontend interface, Bootstrap for responsive layout, Node.js with Express for backend processing, and MySQL for relational data storage. The backend validates customer and admin requests, manages stock-aware ordering, stores order history, protects privileged routes, and produces dashboard summaries for store administration.',
      'This report follows the same broad documentation style used in the previous project model by presenting synopsis, introduction, system analysis, requirements, project description, system design, testing, implementation, source code samples, output screens, conclusion, and future enhancement. Special emphasis is given to the admin section because the project includes real operational screens for products, sections, orders, users, support, and sub-admin control.'
    )
    Subsections = @()
  },
  @{
    Title = '2. INTRODUCTION'
    Intro = @(
      'E-commerce systems have become an essential part of modern business because they allow customers to explore products, compare choices, place orders, and receive support without depending on a physical counter. A successful e-commerce website must therefore balance visual presentation, transactional correctness, account continuity, and operational administration.',
      'LuxeCart was developed as an academic project to demonstrate how a modern online store can be structured using current web technologies while still remaining understandable, demonstrable, and extendable.'
    )
    Subsections = @(
      @{
        Title      = '2.1 Project Profile'
        Paragraphs = @(
          'The LuxeCart project represents a multi-category online store in which fashion, accessories, home decor, office products, and lifestyle goods can be presented through a unified interface. Customers can browse from the homepage, move into product details, add items to cart, and complete orders through a structured checkout page.',
          'Beyond the shopping path, the project supports account registration, password hint based recovery, profile editing, order history review, and support ticket management. On the admin side, the system offers a dashboard overview, section management, product maintenance, order inspection, customer-user review, support response handling, and sub-admin management.'
        )
        Summary    = 'The project profile shows that LuxeCart is designed as a complete web application with both customer and administrator responsibilities.'
      },
      @{
        Title      = '2.2 Objectives of the Project'
        Paragraphs = @('The major objectives of the project are listed below.')
        Points     = @(
          'To build a complete e-commerce website using Angular, Bootstrap, Express.js, and MySQL.',
          'To provide a clear customer experience for browsing, cart handling, checkout, orders, and support.',
          'To implement account management with registration, sign-in, profile update, password change, and recovery behavior.',
          'To create an admin dashboard that can manage sections, products, orders, users, support tickets, and sub-admin accounts.',
          'To preserve data integrity through relational database design, foreign keys, validation, and order-reference tracking.',
          'To document the project in the same detailed report flow used in the previous project model.'
        )
        Summary    = 'These objectives guided both development and documentation so that the system remains technically meaningful and academically presentable.'
      },
      @{
        Title      = '2.3 Scope of the Project'
        Paragraphs = @(
          'The scope of LuxeCart includes the main business activities expected in a student-level e-commerce platform. Customers can view products, search and filter by category, manage cart quantities, save items for later, submit an order, view order history, and raise support requests linked to valid order references.',
          'The administrative scope includes login protected management for products, store sections, revenue and stock overview, recent orders, support ticket response, customer activity review, and sub-admin maintenance. The present version is designed for local development and academic demonstration.'
        )
        Summary    = 'The scope is broad enough to represent real commerce workflows while still remaining manageable for a final-year project.'
      },
      @{
        Title      = '2.4 Web Application Implementation'
        Paragraphs = @(
          'The frontend is implemented in Angular 21 with TypeScript and Bootstrap 5, which allows the pages to be divided into reusable components and styled responsively for desktop and mobile display. Customer screens and admin screens are organized through application state, service calls, and structured event flow.',
          'The backend is implemented with Express 5 on Node.js. It exposes routes for authentication, products, store sections, orders, support tickets, admin accounts, and dashboard overview. MySQL stores relational data for catalog items, orders, order items, support tickets, customer accounts, admin accounts, and masked payment card snapshots.'
        )
        Summary    = 'The implementation approach demonstrates a modern multi-layer web application where the interface, backend logic, and data store cooperate through well-defined modules.'
      },
      @{
        Title      = '2.5 Web Application Protection'
        Paragraphs = @(
          'Security and control are important in any commerce-oriented project. LuxeCart applies validation on both the frontend and backend, separates admin access from customer access, uses password hashing with salt values, and stores only masked card snapshots rather than full card numbers or CVV values.',
          'Support requests are linked to valid customer orders, protected admin requests require a session token, and stock validation is repeated at order creation time.'
        )
        Summary    = 'The project therefore treats protection as a design concern rather than as an afterthought.'
      },
      @{
        Title      = '2.6 Project Profile'
        Paragraphs = @(
          'LuxeCart was prepared as a B.Sc. Information Technology project report and demonstration system. It reflects the academic goal of showing analysis, design, implementation, testing, and documentation in one continuous workflow rather than presenting only isolated screens or code fragments.',
          'Because the project contains both storefront behavior and admin behavior, it gives a stronger demonstration value during review and viva presentation.'
        )
        Summary    = 'This profile makes LuxeCart suitable as a complete final project topic with strong documentation potential.'
      }
    )
  },
  @{
    Title = '3. SYSTEM ANALYSIS'
    Intro = @('System analysis studies the practical need for the software, the weaknesses in simpler or existing approaches, and the feasibility of the proposed solution.')
    Subsections = @(
      @{
        Title      = '3.1 Existing System'
        Paragraphs = @(
          'A simple or manual shopping arrangement usually relies on disconnected product records, informal customer communication, and repeated manual checking of stock and order details. Customers may have to depend on phone calls, chat messages, or screenshots to verify orders and issues.',
          'Such a workflow becomes difficult to manage when the number of products, customers, or support requests increases.'
        )
        Summary    = 'The existing style of operation is therefore slow, repetitive, and difficult to track when the business grows.'
      },
      @{
        Title      = '3.2 Proposed System'
        Paragraphs = @(
          'The proposed system is a complete web-based e-commerce application that brings customer operations and administrative operations into one integrated platform. Customers can browse items, maintain carts, place orders, and raise support requests, while the admin can track products, sections, orders, users, and ticket resolution from a protected dashboard.'
        )
        Summary    = 'The proposed system improves speed, accuracy, accountability, and user satisfaction compared with manual or fragmented approaches.'
      },
      @{
        Title      = '3.3 Problem of Existing System'
        Paragraphs = @(
          'The major problems found in a less organized store process are lack of centralized catalog maintenance, difficulty in validating orders, weak support traceability, and the absence of an analytical admin view. Without a protected admin panel, many business tasks depend on direct database edits or scattered manual notes.'
        )
        Summary    = 'These problems justified the need for a more structured e-commerce system with better user flow and admin control.'
      },
      @{
        Title      = '3.4 Feasibility Study'
        Paragraphs = @('A feasibility study was carried out to determine whether the project could be completed within the available time, tools, and academic constraints.')
        Summary    = ''
      },
      @{
        Title      = '3.4.1 Technical Feasibility'
        Paragraphs = @('The project is technically feasible because it uses a standard and well-supported web stack. Angular is suitable for modular UI development, Express.js supports structured API routing, and MySQL provides the relational integrity required for catalog, order, and support data.')
        Summary    = 'The selected tools are stable, understandable, and appropriate for the project scope.'
      },
      @{
        Title      = '3.4.2 Economic Feasibility'
        Paragraphs = @('The development stack used in the project is economical because Angular, Node.js, Express.js, Bootstrap, and MySQL can be used without license cost in the academic development environment.')
        Summary    = 'The project is economically feasible because the cost of development and demonstration is low compared with the value gained in learning and functionality.'
      },
      @{
        Title      = '3.4.3 Operational Feasibility'
        Paragraphs = @('LuxeCart is operationally feasible because both customer and admin workflows follow familiar patterns. Customers can browse, add to cart, and place orders through a flow that resembles real e-commerce practice. Administrators receive one grouped workspace instead of multiple disconnected tools.')
        Summary    = 'The project is operationally practical because it is understandable, task-oriented, and usable by both customers and store operators.'
      }
    )
  },
  @{
    Title = '4. SYSTEM REQUIREMENTS'
    Intro = @('System requirements describe the hardware and software environment used for development and demonstration of the project.')
    Subsections = @(
      @{
        Title      = '4.1 Hardware Specification'
        Paragraphs = @(
          "Processor : $processorName",
          "RAM : $ramGb GB",
          'Storage : 512 GB SSD recommended for development and assets',
          'Display : Standard laptop display with internet access',
          'Input Devices : Keyboard, touchpad or mouse'
        )
        Summary    = 'These hardware resources are sufficient to run Angular, Node.js, MySQL, documentation tools, and browser-based testing during project work.'
      },
      @{
        Title      = '4.2 Software Specification'
        Paragraphs = @(
          "Operating System : $osCaption",
          'Frontend Framework : Angular 21.2 with TypeScript',
          'UI Framework : Bootstrap 5.3 and Bootstrap Icons',
          'Backend Platform : Node.js with Express 5.2',
          'Database : MySQL with mysql2 client library',
          'Development Tools : Visual Studio Code, npm, and browser developer tools'
        )
        Summary    = 'The software requirement list reflects a current and practical stack for full-stack web development.'
      },
      @{
        Title      = '4.3 Software Description'
        Paragraphs = @(
          'Angular is used to build the customer pages and admin pages through reusable components, typed models, and form handling. Bootstrap is used for grid layout, utility classes, forms, buttons, and responsive spacing.',
          'Express.js provides the server-side routing layer, validation flow, session-oriented admin logic, and integration with MySQL. MySQL stores structured data for sections, products, orders, order items, support tickets, customer accounts, admin accounts, and masked card details.'
        )
        Summary    = 'The selected software stack is modern enough for real web development while still being straightforward enough for academic explanation.'
      }
    )
  }
)

$chapters += @(
  @{
    Title = '5. PROJECT DESCRIPTION'
    Intro = @('Project description explains the major modules, the user-facing flow, and the administrative flow of the LuxeCart application.')
    ListItems = @(
      'Homepage and product discovery',
      'Product detail and cart handling',
      'Checkout and order confirmation',
      'Customer account, orders, and support',
      'Admin login and dashboard overview',
      'Section management and product maintenance',
      'Order monitoring and customer-user review',
      'Support handling and sub-admin management'
    )
    Subsections = @(
      @{
        Title      = '5.1 Customer Interface Module'
        Paragraphs = @(
          'The customer interface begins at the homepage where the user can browse categories, promotional cards, and highlighted products. Product detail pages expand the selected item through larger imagery, description, price, badge, rating, and stock-aware messaging.'
        )
        Points     = @(
          'Homepage supports discovery through banners, sections, and featured products.',
          'Search and category browsing help customers find products quickly.',
          'Cart controls preserve intent while preventing invalid stock quantities.',
          'Saved items improve continuity for later shopping.'
        )
        Summary    = 'The customer interface module is responsible for guiding the user from first visit to purchase intent in a smooth and visually clear way.'
      },
      @{
        Title      = '5.2 Checkout and Order Module'
        Paragraphs = @(
          'The checkout module converts selected products into a structured transaction request. It captures customer identity, contact information, delivery address, payment method, notes, and item details in one validated form.',
          'After the order is processed, the confirmation view presents a generated order reference and a clear success summary.'
        )
        Points     = @(
          'Supports cart-based and buy-now ordering flows.',
          'Validates email, mobile number, address fields, payment method, and item list.',
          'Stores only masked card snapshot values for academic card payment handling.',
          'Generates a readable order reference for later review and support.'
        )
        Summary    = 'This module is the transactional core of the system because it connects interface input with database-backed order creation.'
      },
      @{
        Title      = '5.3 Account and Support Module'
        Paragraphs = @(
          'The account module handles customer registration, sign-in, profile update, password change, and password hint based recovery. The orders page presents previous purchases and order detail access. The support page allows the customer to submit order-linked issues and view the latest status together with any admin response.'
        )
        Summary    = 'These modules show that LuxeCart supports the full customer lifecycle, not only the initial product selection stage.'
      },
      @{
        Title      = '5.4 Admin Interface Module'
        Paragraphs = @(
          'The admin section is one of the strongest parts of the project and is documented in the same clear flow expected in the previous report model. The admin first signs in through a protected login form and then enters a dashboard that summarizes products, inventory units, recent orders, sold units, revenue, and actionable support tickets.',
          'From the admin workspace, the operator can manage sections, create or edit products, inspect customer order details, review customer-user activity, reply to support tickets, and maintain sub-admin accounts.'
        )
        Points     = @(
          'Admin login supports email or mobile number with password validation.',
          'Dashboard overview displays revenue, orders, sold units, stock, and ticket status.',
          'Section and product management keep the storefront catalog updated.',
          'Customer-user review combines account, order, and support information.',
          'Sub-admin creation supports controlled staff expansion with role awareness.'
        )
        Summary    = 'The admin interface module gives LuxeCart the same kind of clearly explained operational section that the old report model used for important modules.'
      },
      @{
        Title      = '5.5 Module Flow Summary'
        Paragraphs = @(
          'The overall module flow starts when the customer visits the homepage, explores categories, selects a product, adds it to cart, and proceeds to checkout. Once the order is created, the same data becomes visible in order history and admin reporting. If a problem occurs, the customer can use the support module, and the admin can resolve the case through the dashboard.'
        )
        Summary    = 'The flow summary confirms that LuxeCart behaves like a connected business system instead of a collection of unrelated screens.'
      }
    )
  },
  @{
    Title = '6. SYSTEM DESIGN'
    Intro = @('System design explains how the application accepts data, produces output, structures modules, manages relational storage, and protects important actions.')
    Subsections = @(
      @{
        Title      = '6.1 Input Design'
        Paragraphs = @(
          'Input design in LuxeCart focuses on clear data entry, validation, and role-oriented forms. Customer inputs include registration, sign-in, profile editing, cart quantity changes, checkout, and support requests. Admin inputs include login, section creation, product editing, support response, and sub-admin maintenance.'
        )
        Points     = @(
          'Registration captures identity and password hint data for recovery continuity.',
          'Checkout captures contact, address, payment method, notes, and item lists.',
          'Support requests require a valid order reference and clear subject details.',
          'Admin product forms capture image, price, rating, stock, badge, and featured state.'
        )
        Summary    = 'The input design aims to reduce ambiguity while keeping real shopping and admin actions easy to perform.'
      },
      @{
        Title      = '6.2 Output Design'
        Paragraphs = @(
          'Output design covers the visual and informational results shown to the user after system processing. On the customer side, outputs include homepage product cards, stock messages, order totals, order confirmation, order history, and support status. On the admin side, outputs include revenue metrics, low-stock alerts, recent orders, customer activity, and support load.'
        )
        Summary    = 'Good output design makes the system understandable to both customers and administrators.'
      },
      @{
        Title      = '6.3 System Architecture'
        Paragraphs = @(
          'The architecture of LuxeCart follows a layered full-stack design. The Angular frontend presents customer and admin screens, communicates with the Express API through service calls, and receives structured JSON responses. The Express backend performs validation, authentication, stock-aware order processing, support handling, and dashboard aggregation. MySQL stores the permanent transactional data.'
        )
        Summary    = 'The architecture diagram below represents the relationship between the interface, API, database, and supporting admin or customer workflows.'
      },
      @{
        Title      = '6.4 Data Flow Diagram'
        Paragraphs = @(
          'The data flow diagram explains how information moves between customer, admin, application processes, and stored data. Different DFD levels help describe the system from broad interaction down to transactional detail.'
        )
        Summary    = 'The following DFD pages show the flow from a high-level store view down to more detailed checkout and admin control behavior.'
      },
      @{
        Title      = '6.5 Database Design and Normalization'
        Paragraphs = @(
          'The database design of LuxeCart follows a relational model. Products and sections support catalog presentation, orders and order items preserve transaction history, customer and admin accounts preserve role-specific identity, support tickets preserve issue workflows, and card details store masked payment snapshots.'
        )
        Points     = @(
          'store_sections organizes the storefront and admin catalog structure.',
          'products stores the main sellable items with price, stock, image, badge, and featured state.',
          'orders and order_items preserve the complete purchase structure.',
          'admin_accounts and customer_accounts separate administrative identity from customer identity.',
          'support_tickets keeps issue history and admin response traceable.'
        )
        Summary    = 'The ER diagram and the table structure pages make the database section explicit in the same detailed manner expected in a complete project report.'
      },
      @{
        Title      = '6.6 Security Design and Control'
        Paragraphs = @(
          'Security design in LuxeCart includes password hashing with salt values, protected admin sessions, role-aware route validation, masked card storage, and order-reference ownership checks for support requests. Operational control is also part of security because low-stock checks prevent overselling and timestamps improve traceability.'
        )
        Summary    = 'The security diagram highlights the protection boundaries between customer access, admin access, validation logic, and stored data.'
      }
    )
  },
  @{
    Title = '7. SYSTEM TESTING'
    Intro = @('System testing was carried out to confirm that the major customer and admin workflows behave correctly, reject invalid input, and preserve reliable data.')
    Subsections = @(
      @{
        Title      = '7.1 Test Strategy'
        Paragraphs = @('Testing was divided into customer account tests, checkout and order tests, admin tests, and reliability tests.')
        Summary    = 'This testing strategy keeps attention on the highest-impact workflows of the project.'
      },
      @{
        Title      = '7.2 Customer Account Test Cases'
        Points     = @(
          'Verify that a customer can register with valid name, email, phone, password, and password hint values.',
          'Verify that duplicate email registration is rejected with a clear user-facing message.',
          'Verify that duplicate mobile number registration is blocked.',
          'Verify that login succeeds with correct credentials and fails with invalid credentials.',
          'Verify that password hint based recovery only succeeds when the stored hint matches.'
        )
        Summary    = 'These tests confirm that identity management and account continuity behave in a predictable way.'
      },
      @{
        Title      = '7.3 Checkout and Order Test Cases'
        Points     = @(
          'Verify that checkout is rejected when no valid items are supplied.',
          'Verify that invalid email or mobile values prevent order placement.',
          'Verify that card payment rejects incomplete masked card snapshot details.',
          'Verify that stock-aware rules reject quantity requests beyond available units.',
          'Verify that a successful order inserts order header and order-item rows and returns an order reference.'
        )
        Summary    = 'Checkout testing focuses on the most business-critical part of the system.'
      },
      @{
        Title      = '7.4 Admin Test Cases'
        Points     = @(
          'Verify that admin login rejects invalid email, phone, or password input.',
          'Verify that protected admin routes reject missing or expired admin sessions.',
          'Verify that product create or update actions become visible in the storefront data.',
          'Verify that support ticket status and response updates appear correctly for the customer and admin views.',
          'Verify that overview dashboard metrics reflect recent order and stock activity.'
        )
        Summary    = 'Admin testing confirms that the management side of the project is not only present but operationally meaningful.'
      },
      @{
        Title      = '7.5 Validation and Reliability Tests'
        Points     = @(
          'Verify that support submission fails when the order reference does not belong to the supplied email.',
          'Verify that invalid product IDs in order payloads are rejected before insertion.',
          'Verify that foreign key rules prevent inconsistent order-item records.',
          'Verify that build generation succeeds for the Angular frontend after changes.',
          'Verify that the health route responds correctly after backend startup.'
        )
        Summary    = 'Reliability tests make sure that the application fails safely instead of storing broken or unauthorized data.'
      }
    )
  },
  @{
    Title = '8. SYSTEM IMPLEMENTATION'
    Intro = @('Implementation explains how the planned modules were translated into working code and data structures.')
    Subsections = @(
      @{
        Title      = '8.1 Frontend Implementation'
        Paragraphs = @('The frontend is organized into Angular pages and models that separate the homepage, product detail, checkout, support, and admin flows. Typed interfaces help maintain consistency between visual components and backend API responses.')
        Summary    = 'Frontend implementation combines reusability, responsiveness, and state-aware interaction.'
      },
      @{
        Title      = '8.2 Backend Implementation'
        Paragraphs = @('The backend was implemented in Express and organized around routes for authentication, products, store sections, orders, support, admin overview, admin accounts, and customer-user review. Validation helpers normalize email, phone, section name, card snapshot values, and order references before database actions are performed.')
        Summary    = 'Backend implementation focuses on correctness, validation, and business continuity across multiple workflows.'
      },
      @{
        Title      = '8.3 Database Implementation'
        Paragraphs = @('The database implementation begins with a schema file that creates the main catalog, order, support, and admin tables. Runtime table checks help keep required columns and indexes present even as the project evolves.')
        Summary    = 'Database implementation ensures that the project can be recreated and demonstrated consistently on the development machine.'
      },
      @{
        Title      = '8.4 Admin Reporting and Monitoring'
        Paragraphs = @('The admin dashboard combines product count, inventory units, order count, sold units, revenue, recent orders, and support ticket load. This provides actual store-management insight instead of forcing the admin to inspect raw tables manually.')
        Summary    = 'The admin implementation is therefore not decorative; it is a functional management environment.'
      },
      @{
        Title      = '8.5 Deployment and Maintenance'
        Paragraphs = @('The project can be run locally through the provided npm scripts so that the frontend and backend start together for development. For future maintenance, the project should continue to use schema backups, image consistency checks, frontend build verification, and admin account review.')
        Summary    = 'Implementation is complete enough for academic submission while still leaving room for production-oriented refinement later.'
      }
    )
  },
  @{
    Title = '9. SOURCE CODE'
    Intro = @('This chapter presents selected source code excerpts from the actual project files.')
    Subsections = @()
  },
  @{
    Title = '10. SAMPLE OUTPUT'
    Intro = @('The following pages present major user interface outputs captured from the LuxeCart project. They show both the customer-facing screens and the admin-facing screens so that the report documents the visible working result of the project in detail.')
    Subsections = @()
  },
  @{
    Title = '11. CONCLUSION'
    Intro = @(
      'LuxeCart E-Commerce Website successfully demonstrates how a modern shopping platform can be designed and implemented as a complete academic web project. The system supports customer browsing, ordering, account continuity, support handling, and a clearly explained admin management workflow within one connected application.',
      'The project also shows that good documentation must explain not only screens and code, but also flow, data movement, design decisions, feasibility, testing, and practical output.'
    )
    Subsections = @()
  },
  @{
    Title = '12. FUTURE ENHANCEMENT'
    Intro = @('The current project is complete for academic submission, but several meaningful extensions can strengthen it further in the future.')
    ListItems = @(
      'Integration with a real payment gateway instead of academic card snapshot simulation.',
      'Courier and shipment tracking support for delivery visibility.',
      'Advanced search, recommendation logic, and product review features.',
      'Image upload storage optimization and CDN-backed delivery.',
      'Production deployment with stronger secret management and hosted database backups.',
      'Expanded analytics, invoice generation, and richer admin reporting widgets.'
    )
    Subsections = @()
  },
  @{
    Title = '13. BIBLIOGRAPHY'
    Intro = @('The following references and technical sources were used as the conceptual base for the project stack and implementation approach.')
    ListItems = @(
      'Angular Documentation',
      'Bootstrap Documentation',
      'Express.js Documentation',
      'Node.js Documentation',
      'MySQL Reference Manual',
      'Software Engineering and Database Design classroom notes'
    )
    Subsections = @()
  }
)

foreach ($chapter in $chapters[0..5]) {
  Add-Chapter $contentItems $chapter
}

Add-ImageContent $contentItems 'Figure 6.1 System Architecture' 'Overall architecture of the LuxeCart application showing the Angular frontend, Express backend, MySQL database, and the customer or admin interaction flow.' (Join-Path $projectRoot 'architecture-diagram.png')
Add-ImageContent $contentItems 'Figure 6.2 DFD Level 0' 'High-level data flow between customer, administrator, application processes, and the main data stores.' (Join-Path $projectRoot 'dfd-level0.png')
Add-ImageContent $contentItems 'Figure 6.3 DFD Level 1' 'Expanded data flow showing catalog, account, order, and support processes in more detail.' (Join-Path $projectRoot 'dfd-level1.png')
Add-ImageContent $contentItems 'Figure 6.4 DFD Level 2' 'Detailed view of validation and transaction-heavy activities including checkout and admin control.' (Join-Path $projectRoot 'dfd-level2.png')
Add-ImageContent $contentItems 'Figure 6.5 ER Diagram' 'Entity relationship diagram showing the main relational tables used in the LuxeCart database.' (Join-Path $projectRoot 'er-diagram-clean.png')
Add-ImageContent $contentItems 'Figure 6.6 Security Diagram' 'Security diagram describing authentication, validation, admin protection, and sensitive data handling boundaries.' (Join-Path $projectRoot 'security-diagram.png')

foreach ($chapter in $chapters[6..8]) {
  Add-Chapter $contentItems $chapter
}

Add-CodeListing $contentItems '9.1 Checkout Component Sample' 'The following excerpt from the Angular checkout page shows how payment handling, stock messaging, and form submission are controlled in the frontend.' (Get-CodeLines (Join-Path $projectRoot 'frontend\src\app\pages\checkout-page\checkout-page.component.ts') 17 103)
Add-CodeListing $contentItems '9.2 Admin Login Route Sample' 'This backend excerpt shows protected admin authentication logic, input validation, and session creation.' (Get-CodeLines (Join-Path $projectRoot 'backend\server.js') 1507 1542)
Add-CodeListing $contentItems '9.3 Support Ticket Route Sample' 'This route demonstrates order-reference validation and support ticket creation in the backend.' (Get-CodeLines (Join-Path $projectRoot 'backend\server.js') 2936 3009)
Add-CodeListing $contentItems '9.4 Order Creation Route Sample' 'This excerpt shows the start of the order creation flow where checkout data is validated before the transaction proceeds.' (Get-CodeLines (Join-Path $projectRoot 'backend\server.js') 3132 3235)
Add-CodeListing $contentItems '9.5 Database Schema Sample' 'The following SQL excerpt presents the table creation structure used by LuxeCart for catalog, order, support, and admin data.' (Get-CodeLines (Join-Path $projectRoot 'backend\database\schema.sql') 11 92)

Add-Chapter $contentItems $chapters[9]

Add-ImageContent $contentItems '10.1 Home Page' 'Main customer homepage showing promotional banners, product cards, and the storefront presentation used for product discovery.' (Join-Path $projectRoot 'docs-home.png')
Add-ImageContent $contentItems '10.2 Home Additional View' 'Additional homepage view highlighting the hero area and marketing presentation style of the project.' (Join-Path $projectRoot 'docs-home-top.jpg')
Add-ImageContent $contentItems '10.3 Home Mid Section View' 'Mid-page home screen output showing additional catalog presentation and browsing sections.' (Join-Path $projectRoot 'docs-home-mid.jpg')
Add-ImageContent $contentItems '10.4 Product Detail Page' 'Detailed customer product page showing the enlarged item, price, stock, and purchase actions.' (Join-Path $projectRoot 'docs-product.png')
Add-ImageContent $contentItems '10.5 Product Additional View' 'Additional product detail capture showing more of the customer-facing presentation flow.' (Join-Path $projectRoot 'docs-product-top.jpg')
Add-ImageContent $contentItems '10.6 Product Lower Section View' 'Extended product view showing more layout detail from the item presentation page.' (Join-Path $projectRoot 'docs-product-bottom.jpg')
Add-ImageContent $contentItems '10.7 Checkout Page' 'Main checkout screen combining cart review, delivery details, payment method, and total summary.' (Join-Path $projectRoot 'docs-checkout.png')
Add-ImageContent $contentItems '10.8 Checkout Split View' 'Additional checkout capture used to document the form area more clearly.' (Join-Path $projectRoot 'docs-checkout-left.jpg')
Add-ImageContent $contentItems '10.9 Checkout Summary View' 'Complementary checkout image showing the second side of the order form and summary layout.' (Join-Path $projectRoot 'docs-checkout-right.jpg')
Add-ImageContent $contentItems '10.10 Orders Page' 'Customer orders page showing previous order history and continuity after purchase.' (Join-Path $projectRoot 'docs-orders.png')
Add-ImageContent $contentItems '10.11 Orders Detail View' 'Additional orders interface capture showing centered detail content from the order history area.' (Join-Path $projectRoot 'docs-orders-center.jpg')
Add-ImageContent $contentItems '10.12 Support Page' 'Support screen used for ticket creation, ticket history, and response visibility.' (Join-Path $projectRoot 'docs-support.png')
Add-ImageContent $contentItems '10.13 Support Top View' 'Additional support interface capture showing the upper layout and help-oriented presentation.' (Join-Path $projectRoot 'docs-support-top.jpg')
Add-ImageContent $contentItems '10.14 Admin Dashboard' 'Administrative dashboard showing overview metrics, operational cards, and management access for the store.' (Join-Path $projectRoot 'docs-admin.png')

foreach ($chapter in $chapters[10..12]) {
  Add-Chapter $contentItems $chapter
}

if (Test-Path $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

Copy-Item -LiteralPath $BaseDocPath -Destination $OutputPath -Force

$zip = [System.IO.Compression.ZipFile]::Open($OutputPath, 'Update')

try {
  $entry = $zip.GetEntry('word/document.xml')
  $relsEntry = $zip.GetEntry('word/_rels/document.xml.rels')
  $contentTypesEntry = $zip.GetEntry('[Content_Types].xml')

  $reader = New-Object System.IO.StreamReader($entry.Open())
  [xml]$documentXml = $reader.ReadToEnd()
  $reader.Close()

  $relsReader = New-Object System.IO.StreamReader($relsEntry.Open())
  [xml]$relationshipsXml = $relsReader.ReadToEnd()
  $relsReader.Close()

  $contentTypesReader = New-Object System.IO.StreamReader($contentTypesEntry.Open())
  [xml]$contentTypesXml = $contentTypesReader.ReadToEnd()
  $contentTypesReader.Close()

  $ns = New-Object System.Xml.XmlNamespaceManager($documentXml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

  $coverReplacements = @(
    @{
      From = 'LuxeCart – Full-Stack E-Commerce Marketplace'
      To   = 'LuxeCart E-Commerce Website'
    },
    @{
      From = 'LUXECART – FULL-STACK E-COMMERCE MARKETPLACE'
      To   = 'LUXECART E-COMMERCE WEBSITE'
    },
    @{
      From = 'Full-Stack E-Commerce Marketplace'
      To   = 'E-Commerce Website'
    },
    @{
      From = 'FULL-STACK E-COMMERCE MARKETPLACE'
      To   = 'E-COMMERCE WEBSITE'
    },
    @{
      From = 'LuxeCart – E-Commerce Website'
      To   = 'LuxeCart E-Commerce Website'
    },
    @{
      From = 'LUXECART – E-COMMERCE WEBSITE'
      To   = 'LUXECART E-COMMERCE WEBSITE'
    },
    @{
      From = 'carried out by her under my guidance and supervision'
      To   = 'carried out by him under my guidance and supervision'
    },
    @{
      From = 'by her under my guidance and supervision'
      To   = 'by him under my guidance and supervision'
    }
  )

  foreach ($textNode in $documentXml.SelectNodes('//w:t', $ns)) {
    foreach ($replacement in $coverReplacements) {
      if ($textNode.InnerText.Contains($replacement.From)) {
        $textNode.InnerText = $textNode.InnerText.Replace($replacement.From, $replacement.To)
      }
    }
  }

  foreach ($paragraphNode in $documentXml.SelectNodes('//w:body/w:p', $ns)) {
    $paragraphTextNodes = $paragraphNode.SelectNodes('.//w:t', $ns)
    if (-not $paragraphTextNodes -or $paragraphTextNodes.Count -eq 0) {
      continue
    }

    $paragraphText = ($paragraphTextNodes | ForEach-Object { $_.InnerText }) -join ''
    $updatedParagraphText = $paragraphText.
      Replace('LuxeCart – E-Commerce Website', 'LuxeCart E-Commerce Website').
      Replace('LUXECART – E-COMMERCE WEBSITE', 'LUXECART E-COMMERCE WEBSITE')

    if ($paragraphText -like 'This is to certify that the project report entitled*submitted by RENJITH R*') {
      $updatedParagraphText = 'This is to certify that the project report entitled "LuxeCart E-Commerce Website" submitted by RENJITH R in partial fulfilment of the requirements for the award of the degree of Master of Science in Information Technology of Manonmaniam Sundaranar University is a bona fide record of the work carried out by him under my guidance and supervision during April 2026. Further, I certify that this project report or any part thereof has not been submitted elsewhere for the award of any other degree, diploma, or similar qualification, to the best of my knowledge.'
    }

    if ($paragraphText -like 'I hereby declare that this dissertation entitled*') {
      $updatedParagraphText = 'I hereby declare that this dissertation entitled "LUXECART E-COMMERCE WEBSITE" is a bonafide record of the work carried out by me at Lekshmipuram College of Arts and Science, Neyyoor, in partial fulfillment of the requirements for the award of the degree of Master of Science in Information Technology of Manonmaniam Sundaranar University, Tirunelveli. I further declare that this report or any part thereof has not been submitted elsewhere for the award of any other degree or diploma.'
    }

    if ($updatedParagraphText -ne $paragraphText) {
      $paragraphTextNodes[0].InnerText = $updatedParagraphText

      for ($index = 1; $index -lt $paragraphTextNodes.Count; $index++) {
        $paragraphTextNodes[$index].InnerText = ''
      }
    }
  }

  $bodyNode = $documentXml.SelectSingleNode('//w:body', $ns)
  $paragraphNodes = $bodyNode.SelectNodes('./w:p', $ns)
  $startReplaceNode = $null

  foreach ($paragraphNode in $paragraphNodes) {
    $text = Get-ParagraphText -paragraphNode $paragraphNode -namespaceManager $ns
    if ($text -match '^\s*CONTENTS\s*$') {
      $startReplaceNode = $paragraphNode
      break
    }
  }

  if (-not $startReplaceNode) {
    foreach ($paragraphNode in $paragraphNodes) {
      $text = Get-ParagraphText -paragraphNode $paragraphNode -namespaceManager $ns
      if ($text -match '^\s*1\.\s*INTRODUCTION') {
        $startReplaceNode = $paragraphNode
        break
      }
    }
  }

  if (-not $startReplaceNode) {
    throw 'Could not find the starting paragraph to replace old report content.'
  }

  $sectionPropertiesNode = $bodyNode.SelectSingleNode('./w:sectPr', $ns)
  $currentNode = $startReplaceNode

  while ($currentNode -and $currentNode -ne $sectionPropertiesNode) {
    $nextNode = $currentNode.NextSibling
    [void]$bodyNode.RemoveChild($currentNode)
    $currentNode = $nextNode
  }

  $docPrId = 5000
  $imageIndex = 1
  $renderedParts = New-Object System.Collections.Generic.List[string]

  foreach ($item in $contentItems) {
    if ($item.Type -eq 'xml') {
      [void]$renderedParts.Add($item.Value)
      continue
    }

    if ($item.PageBreakBefore) {
      [void]$renderedParts.Add((New-PageBreakXml))
    }

    [void]$renderedParts.Add((New-CenteredCaptionXml $item.Title))
    [void]$renderedParts.Add((New-BodyXml $item.Description))

    if (Test-Path $item.Path) {
      $relationshipId = Add-ImageToPackage -zip $zip -relationshipsXml $relationshipsXml -imagePath $item.Path -entryName ("codex-figure-" + $imageIndex.ToString('00'))
      $size = Get-ScaledImageEmu -imagePath $item.Path
      [void]$renderedParts.Add((New-ImageParagraphXml -relationshipId $relationshipId -name $item.Title -widthEmu $size.Width -heightEmu $size.Height -docPrId $docPrId))
      $docPrId++
      $imageIndex++
    }
  }

  $generatedXml = [string]::Join('', $renderedParts)
  [xml]$fragmentXml = "<root xmlns:w='http://schemas.openxmlformats.org/wordprocessingml/2006/main'>$generatedXml</root>"

  foreach ($childNode in @($fragmentXml.root.ChildNodes)) {
    $importedNode = $documentXml.ImportNode($childNode, $true)
    if ($sectionPropertiesNode) {
      [void]$bodyNode.InsertBefore($importedNode, $sectionPropertiesNode)
    } else {
      [void]$bodyNode.AppendChild($importedNode)
    }
  }

  $entry.Delete()
  $newEntry = $zip.CreateEntry('word/document.xml')
  $writer = New-Object System.IO.StreamWriter($newEntry.Open())
  $writer.Write($documentXml.OuterXml)
  $writer.Close()

  $relsEntry.Delete()
  $newRelsEntry = $zip.CreateEntry('word/_rels/document.xml.rels')
  $relsWriter = New-Object System.IO.StreamWriter($newRelsEntry.Open())
  $relsWriter.Write($relationshipsXml.OuterXml)
  $relsWriter.Close()

  $contentTypesNs = 'http://schemas.openxmlformats.org/package/2006/content-types'
  $existingExtensions = @{}
  foreach ($defaultNode in $contentTypesXml.Types.Default) {
    $existingExtensions[$defaultNode.Extension.ToLowerInvariant()] = $true
  }

  foreach ($entryType in @(
      @{ Extension = 'png'; ContentType = 'image/png' },
      @{ Extension = 'jpg'; ContentType = 'image/jpeg' },
      @{ Extension = 'jpeg'; ContentType = 'image/jpeg' }
    )) {
    if (-not $existingExtensions.ContainsKey($entryType.Extension)) {
      $defaultElement = $contentTypesXml.CreateElement('Default', $contentTypesNs)
      $null = $defaultElement.SetAttribute('Extension', $entryType.Extension)
      $null = $defaultElement.SetAttribute('ContentType', $entryType.ContentType)
      $null = $contentTypesXml.Types.AppendChild($defaultElement)
    }
  }

  $contentTypesEntry.Delete()
  $newContentTypesEntry = $zip.CreateEntry('[Content_Types].xml')
  $contentTypesWriter = New-Object System.IO.StreamWriter($newContentTypesEntry.Open())
  $contentTypesWriter.Write($contentTypesXml.OuterXml)
  $contentTypesWriter.Close()
} finally {
  $zip.Dispose()
}

Write-Output "REPORT_READY: $OutputPath"

if (-not $SkipWordVerification) {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0

  try {
    $doc = $word.Documents.Open((Resolve-Path $OutputPath).Path, $false, $true)
    $pages = $doc.ComputeStatistics(2)
    $paragraphs = $doc.Paragraphs.Count
    Write-Output "PAGES: $pages"
    Write-Output "PARAGRAPHS: $paragraphs"
    $doc.Close(0) | Out-Null
  } finally {
    $word.Quit() | Out-Null
  }
}

if (-not $SkipDownloadsCopy) {
  $downloadsPath = 'C:\Users\Admin\Downloads\Renjith-Polished-Project-Report.docx'
  try {
    Copy-Item -LiteralPath $OutputPath -Destination $downloadsPath -Force
  } catch {
    $downloadsPath = 'C:\Users\Admin\Downloads\Renjith-Polished-Project-Report-Updated.docx'
    Copy-Item -LiteralPath $OutputPath -Destination $downloadsPath -Force
  }

  Write-Output "DOWNLOADS_COPY: $downloadsPath"
}
