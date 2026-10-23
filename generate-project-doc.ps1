$template = 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\comp-doc-working-copy.docx'
$output = 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\LuxeCart-Project-Submission.docx'
Copy-Item $template $output -Force

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null

function Set-ParagraphRangeText($document, $startPara, $endPara, $text) {
  $start = $document.Paragraphs.Item($startPara).Range.Start
  $end = $document.Paragraphs.Item($endPara).Range.End
  $range = $document.Range($start, $end)
  $range.Text = $text
}

function Replace-All($document, $findText, $replaceText) {
  $range = $document.Content
  $find = $range.Find
  $find.ClearFormatting()
  $find.Replacement.ClearFormatting()
  $find.Text = $findText
  $find.Replacement.Text = $replaceText
  $find.Forward = $true
  $find.Wrap = 1
  $find.Format = $false
  $find.MatchCase = $false
  $find.MatchWholeWord = $false
  $find.MatchWildcards = $false
  $find.MatchSoundsLike = $false
  $find.MatchAllWordForms = $false
  [void]$find.Execute($findText, $false, $false, $false, $false, $false, $true, 1, $false, $replaceText, 2)
}

function Insert-ImageAtMarker($document, $marker, $imagePath, $widthPoints) {
  $range = $document.Content
  $find = $range.Find
  $find.ClearFormatting()
  $find.Text = $marker
  $find.Forward = $true
  $find.Wrap = 1
  if ($find.Execute()) {
    $target = $range.Duplicate
    $target.Text = ''
    $shape = $document.InlineShapes.AddPicture($imagePath, $false, $true, $target)
    $shape.Width = $widthPoints
    [void]$document.Range($shape.Range.End, $shape.Range.End).InsertParagraphAfter()
  }
}

try {
  $doc = $word.Documents.Open($output)

  Replace-All $doc 'AI LEARNING PLATFORM' 'LUXECART E-COMMERCE WEBSITE'
  Replace-All $doc 'ABIRAMI N H' 'RENJITH R'
  Replace-All $doc '24083066110012101' '20213066110011111'
  Replace-All $doc 'The AI Learning Platform' 'The LuxeCart E-Commerce Website'
  Replace-All $doc 'the AI Learning Platform' 'the LuxeCart E-Commerce Website'
  Replace-All $doc 'The platform' 'The system'
  Replace-All $doc 'carried out by her' 'carried out by him'
  Replace-All $doc 'by her under my guidance and supervision' 'by him under my guidance and supervision'

  Set-ParagraphRangeText $doc 809 819 @'
Books:
Ian Sommerville - Software Engineering
Roger S. Pressman - Software Engineering: A Practitioner's Approach
Websites:
https://angular.dev
https://expressjs.com
https://dev.mysql.com/doc
https://getbootstrap.com
https://nodejs.org
https://github.com
'@

  Set-ParagraphRangeText $doc 783 795 @'
The LuxeCart E-Commerce Website can be improved further by adding a live payment gateway, shipment tracking, downloadable invoice generation, review and rating submission, recommendation systems, and automated email or SMS updates. The platform can also be expanded with cloud deployment, role-based access refinement, image optimization, analytics dashboards, and stronger production security controls.
Key Points:
Razorpay or Stripe payment gateway integration
Shipment and delivery tracking
PDF invoice generation
Customer reviews and ratings
Recommendation engine
Email and SMS alerts
Cloud deployment
Improved admin analytics
Stronger security and access control
Better scalability and performance
'@

  Set-ParagraphRangeText $doc 766 770 @'
The LuxeCart E-Commerce Website successfully demonstrates the design and implementation of a practical full-stack commerce platform using Angular, Express.js, and MySQL. The system supports customer browsing, account handling, cart management, order placement, support tracking, and administrator control in one structured application.
The project improves shopping convenience for customers and simplifies operational work for administrators by providing product, section, order, user, and support management features in a single interface. The integration of frontend, backend, and relational database components ensures smooth data flow, reliable storage, and maintainable architecture.
Overall, the project achieves its main objective of delivering a responsive and feature-rich e-commerce solution. It also creates a strong foundation for future enhancements such as real payment integration, deployment, advanced analytics, and smarter customer experience improvements.
'@

  Set-ParagraphRangeText $doc 559 754 @'
Sample coding
1. ROOT PROJECT SCRIPT:
{
  "scripts": {
    "dev": "concurrently \"npm --prefix backend run dev\" \"npm --prefix frontend start\"",
    "dev:frontend": "npm --prefix frontend start",
    "dev:backend": "npm --prefix backend run dev",
    "build": "npm --prefix frontend run build"
  }
}
2. BACKEND ORDER API CONCEPT:
app.post('/api/orders', async (request, response, next) => {
  // validate checkout payload
  // create order record
  // create order item records
  // store masked card detail summary if needed
  // return confirmation response
});
3. FRONTEND PRODUCT PRICE DISPLAY:
<strong>{{ product.price | currency:'INR':'symbol':'1.0-0' }}</strong>
<small>M.R.P. {{ listPrice | currency:'INR':'symbol':'1.0-0' }}</small>
4. DATABASE TABLE EXAMPLE:
CREATE TABLE orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_reference VARCHAR(32) NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  email VARCHAR(140) NOT NULL,
  payment_method VARCHAR(60) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL
);
Screen Layout
Home Page:
[INSERT_HOME]
Product Detail Page:
[INSERT_PRODUCT]
Shopping Cart / Checkout Page:
[INSERT_CHECKOUT]
Support Page:
[INSERT_SUPPORT]
Customer Sign In / Orders Access Page:
[INSERT_ORDERS]
Admin Login Page:
[INSERT_ADMIN]
'@

  Set-ParagraphRangeText $doc 497 550 @'
Testing is the process of ensuring that the system works accurately, efficiently, and reliably before real use. The LuxeCart project was tested through validation of customer workflows, admin workflows, API communication, and database storage.
There are three major ways to test the program:
For correctness.
For implementation efficiency.
For usability and reliability.
6.1 UNIT TESTING
Unit testing was applied to individual modules such as sign-in validation, sign-up validation, checkout form rules, card detail checks, stock limit logic, admin form handling, and support form constraints.
Advantages:
Easy to identify and fix errors
Improves code quality
Simplifies debugging process
6.2 INTEGRATION TESTING
Integration testing was used to verify the connection between Angular frontend pages, Express API endpoints, and MySQL database tables. It ensured that products, orders, accounts, and support tickets move correctly between the layers.
Advantages:
Detects interface errors
Ensures proper data flow between modules
Improves system reliability
6.3 SYSTEM TESTING
System testing verified the application as a whole, including customer shopping features and the admin management workspace.
Advantages:
Validates overall system performance
Ensures system meets requirements
Identifies missing functionalities
6.4 VALIDATION TESTING
Validation testing ensured that user inputs, toast feedback, order placement, support submission, and admin operations produce the expected results.
Advantages:
Ensures user satisfaction
Confirms system correctness
Improves output accuracy
6.5 USER INTERFACE TESTING
UI testing checked whether pages are responsive, clear, and easy to use on the customer side and admin side.
Advantages:
Enhances user experience
Improves usability
Reduces user confusion
BUILD VERIFICATION
The frontend was additionally verified using the Angular build command to ensure templates, styles, and TypeScript logic compile successfully.
'@

  Set-ParagraphRangeText $doc 482 486 @'
Implementation is the phase in which the system design is transformed into a fully functional application. The LuxeCart E-Commerce Website is developed using Angular for the frontend, Express.js for the backend, and MySQL for the database, allowing structured communication through API endpoints.
The frontend provides customer pages such as home, product detail, checkout, orders, account, sign-in, sign-up, and support, along with an admin workspace for product management, order review, user handling, section management, and support monitoring. The backend processes requests, validates data, manages authentication, and communicates with the database for reliable storage and retrieval.
During implementation, modular coding, validation logic, toast-based feedback, responsive layouts, and database migrations were used to improve maintainability and user experience. The project is designed to be scalable, practical, and suitable for real e-commerce enhancement in future deployments.
'@

  Set-ParagraphRangeText $doc 413 471 @'
Overview
The database is designed to store customer, admin, product, order, and support data securely. It follows relational principles so that data redundancy is reduced and reporting becomes easier.
Tables Used
1. Store Sections Table
Field Name
Type
Description
id
Integer
Primary Key
name
String
Section name
sort_order
Integer
Display order
2. Products Table
Field Name
Type
Description
id
Integer
Primary Key
name
String
Product name
category
String
Category / section name
price
Decimal
Product price
stock
Integer
Available stock
3. Orders Table
Field Name
Type
Description
id
Integer
Primary Key
order_reference
String
Unique order reference
customer_name
String
Customer name
total_amount
Decimal
Final order amount
4. Additional Tables
order_items, support_tickets, admin_accounts, customer_accounts, and card_details are used for item records, customer support, admin login, customer accounts, and safe masked card summaries.
Database Features
Secure data storage
Efficient retrieval
Maintains order history
Supports multiple users and admin workflows
ER Diagram
[INSERT_ER]
'@

  Set-ParagraphRangeText $doc 380 407 @'
Basic Data Flow Diagram Symbols
The data flow diagram (DFD) is an important modeling tool used to show the system process, data movement, external entities, and the way information flows in the application.
Function symbol:
Process module for authentication, shopping, orders, and admin actions.
External entity symbol:
Customer and Admin users interacting with the system.
Data flow symbol:
Represents requests, responses, product data, orders, and support data.
Decision making:
Validation and workflow control before saving data.
DATA FLOW DIAGRAM
[INSERT_DFD]
'@

  Set-ParagraphRangeText $doc 249 367 @'
The LuxeCart E-Commerce Website is developed using modern web technologies that support responsive user interaction, structured API communication, and relational data management. The system follows a layered architecture where the Angular frontend communicates with the Express.js backend, and the backend communicates with the MySQL database.
Angular:
Angular is the frontend framework used to build the customer-facing pages and admin interface.
In this project, Angular is used for:
Creating the storefront interface
Building reusable components
Managing product views and page states
Handling forms and validation
Rendering account, order, support, and admin pages
TypeScript:
TypeScript is used as the core frontend language to provide better code structure, typed models, and maintainable component logic.
Bootstrap:
Bootstrap is used for responsive layouts, form styling, buttons, cards, and utility classes across the application.
Express.js (Backend Framework):
Express.js is used to build API endpoints and manage business logic.
In this project, Express.js performs:
Customer and admin authentication
Product and store section APIs
Order creation and order detail retrieval
Support ticket processing
Admin dashboard data reporting
MySQL Database:
MySQL is used to store structured application data securely.
Data stored includes:
Store sections
Products
Orders and order items
Admin accounts
Customer accounts
Support tickets
Masked card details
Security Features:
The system ensures security through:
User authentication
Password hashing and salt storage
Admin role handling
Input validation
Structured API checks
System Architecture:
The LuxeCart E-Commerce Website follows a three-layer architecture:
Presentation Layer (Angular)
Application Layer (Express.js API)
Data Layer (MySQL Database)
This layered structure improves maintainability, scalability, and performance.
'@

  Set-ParagraphRangeText $doc 224 244 @'
Operating system : Windows 11
Coding language : TypeScript, JavaScript, SQL
Frontend : Angular 21
Backend : Express.js 5.2.1
Tool : Visual Studio Code
Database : MySQL
UI framework : Bootstrap 5.3.8
3.2 Hardware Specification
System : Acer Aspire 7
Hard Disk : 512 GB
Monitor : 15.6 inch Full HD Display
Mouse : Standard optical mouse / touchpad
Ram : 8 GB
'@

  Set-ParagraphRangeText $doc 203 217 @'
The proposed LuxeCart E-Commerce Website overcomes the limitations of older systems by integrating customer shopping features with a modern admin control center.
Key Features:
Customer account registration and login
Product search and category filtering
Wishlist, cart, and buy now flow
Checkout with delivery details and card validation
Order history and recent products view
Support ticket submission and tracking
Admin login and store control workspace
Product, section, user, and support management
Revenue, purchased details, and best performer insights
This system improves online shopping, store monitoring, and customer support within one integrated platform.
'@

  Set-ParagraphRangeText $doc 192 199 @'
Traditional shopping systems and simple catalog websites often provide limited interactivity and weak backend coordination. Existing systems may:
Use static product pages without strong filtering.
Provide limited order review and customer support tracking.
Lack unified admin controls for products, users, and sales.
Offer poor checkout validation and weak account recovery support.
Store less structured business data for reporting.
These limitations reduce usability and make commerce management more difficult.
'@

  Set-ParagraphRangeText $doc 166 168 @'
The LuxeCart E-Commerce Website is a web-based shopping and administration platform designed to provide a complete e-commerce experience for customers and store managers. The system includes customer modules such as product browsing, collections, wishlist, cart, checkout, account management, order history, and support requests.
The application also includes a dedicated admin workspace where products, store sections, users, orders, support tickets, and high-level revenue information can be managed. This makes the system useful not only for shopping, but also for day-to-day operational control.
By integrating a responsive Angular frontend, an Express.js backend, and a MySQL database, the system provides a practical and scalable solution for online commerce workflows.
'@

  Set-ParagraphRangeText $doc 172 177 @'
To develop a full-stack e-commerce website.
To provide customer account creation, login, and recovery support.
To implement product browsing, cart, checkout, and order history modules.
To store products, orders, users, support tickets, and masked card details in MySQL.
To provide an admin panel for product, order, user, and support management.
To create a responsive and user-friendly web interface.
'@

  Set-ParagraphRangeText $doc 111 113 @'
The LuxeCart E-Commerce Website is a full-stack web application developed to deliver a modern online shopping experience with both customer-facing and administrator-facing functionality. The system allows users to browse products by category, search the catalog, view product details, manage carts and wishlists, place orders, review order history, and submit support tickets. It also includes an admin workspace for managing products, store sections, users, orders, revenue views, and support requests.
The project is developed using Angular and TypeScript for the frontend, Bootstrap for responsive interface design, Express.js for the backend API, and MySQL for relational database storage. The application follows a layered architecture where the user interface communicates with backend endpoints, and the backend validates input, applies business rules, and stores data in the database.
Overall, the LuxeCart E-Commerce Website improves shopping efficiency, reduces manual administrative effort, and provides a structured platform for future expansion such as online payment gateways, analytics improvements, and production deployment.
'@

  Insert-ImageAtMarker $doc '[INSERT_DFD]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\dfd-diagram.png' 430
  Insert-ImageAtMarker $doc '[INSERT_ER]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\er-diagram.png' 430
  Insert-ImageAtMarker $doc '[INSERT_HOME]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-home.png' 360
  Insert-ImageAtMarker $doc '[INSERT_PRODUCT]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-product.png' 360
  Insert-ImageAtMarker $doc '[INSERT_CHECKOUT]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-checkout.png' 360
  Insert-ImageAtMarker $doc '[INSERT_SUPPORT]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-support.png' 360
  Insert-ImageAtMarker $doc '[INSERT_ORDERS]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-orders.png' 360
  Insert-ImageAtMarker $doc '[INSERT_ADMIN]' 'C:\Users\Admin\OneDrive\Documents\E-Commerce-Website\docs-admin.png' 360

  $doc.Save()
  $doc.Close()
  $doc = $null
} finally {
  if ($doc) { $doc.Close() | Out-Null }
  $word.Quit() | Out-Null
}

$verifyWord = New-Object -ComObject Word.Application
$verifyWord.Visible = $false
$verifyWord.DisplayAlerts = 0
try {
  $verifyDoc = $verifyWord.Documents.Open($output, $false, $true)
  \"DOC_READY: paragraphs=$($verifyDoc.Paragraphs.Count)\"
  $verifyDoc.Close() | Out-Null
} finally {
  $verifyWord.Quit() | Out-Null
}
