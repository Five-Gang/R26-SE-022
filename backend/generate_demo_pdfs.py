"""
Script to generate rich academic course PDFs for AuraLearn and ingest them into ChromaDB.
"""
import os
import fitz  # PyMuPDF
from ingestion.ingest_pipeline import ingest_documents

PDF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)

COURSES = [
    {
        "filename": "Object-Oriented Programming and Design Principles.pdf",
        "title": "Software Engineering: Object-Oriented Programming & Design Patterns",
        "pages": [
            """CHAPTER 1: FUNDAMENTALS OF OBJECT-ORIENTED PROGRAMMING

1.1 Core Principles of OOP
Object-Oriented Programming (OOP) is a programming paradigm based on the concept of 'objects', which contain data (fields/attributes) and code (methods/functions).

The four fundamental pillars of OOP are:
1. Encapsulation: Bundling data and the methods that operate on that data within a single unit (class), while restricting direct access to some of an object's components (using private/protected access modifiers) to prevent unintended modification.
2. Abstraction: Hiding complex implementation details and exposing only the essential interface to the user.
3. Inheritance: A mechanism where a new class (subclass/derived class) inherits attributes and methods from an existing class (superclass/base class), promoting code reuse and establishing an 'IS-A' relationship.
4. Polymorphism: The ability of different classes to respond to the same message or method call in different ways.

1.2 Deep Dive into Polymorphism
Polymorphism comes from the Greek words 'poly' (many) and 'morph' (forms).
There are two primary types of polymorphism in modern programming:
- Static (Compile-time) Polymorphism: Achieved via Method Overloading and Operator Overloading. Method overloading occurs when multiple methods in the same class share the same name but have different parameter lists (types, number of parameters, or ordering).
- Dynamic (Runtime) Polymorphism: Achieved via Method Overriding. Method overriding occurs when a subclass provides a specific implementation of a method that is already defined in its superclass. The actual method executed is determined at runtime based on the actual object instance (late binding / dynamic dispatch).

Key benefits of polymorphism:
- Extensibility: New classes can be added without altering existing client code that relies on the base interface.
- Loose Coupling: Callers interact with abstract interfaces rather than concrete implementations.""",

            """CHAPTER 2: SOFTWARE DESIGN PATTERNS

2.1 Introduction to Design Patterns
A software design pattern is a general, reusable solution to a commonly occurring problem within a given context in software design. Design patterns are formalized best practices introduced prominently by the 'Gang of Four' (GoF).

Design patterns are categorized into three main families:
1. Creational Patterns: Deal with object creation mechanisms, increasing flexibility and reuse of existing code.
   - Factory Method: Defines an interface for creating an object, but lets subclasses alter the type of objects that will be created.
   - Singleton: Ensures a class has only one instance while providing a global access point to this instance.
   - Builder: Separates the construction of a complex object from its representation.

2. Structural Patterns: Explain how to assemble objects and classes into larger structures while keeping these structures flexible and efficient.
   - Adapter: Allows objects with incompatible interfaces to collaborate.
   - Decorator: Attaches new behaviors to objects by placing these objects inside special wrapper objects.
   - Facade: Provides a simplified interface to a library, a framework, or any other complex set of classes.

3. Behavioral Patterns: Concerned with algorithms and the assignment of responsibilities between objects.
   - Observer Pattern: Defines a subscription mechanism to notify multiple objects about any events that happen to the object they're observing (publisher-subscriber).
   - Strategy Pattern: Defines a family of algorithms, encapsulates each one, and makes them interchangeable at runtime.
   - Command: Encapsulates a request as an object, thereby letting you parameterize clients with different requests."""
        ]
    },
    {
        "filename": "Data Structures and Algorithm Design.pdf",
        "title": "Computer Science: Data Structures and Algorithm Analysis",
        "pages": [
            """CHAPTER 1: TREE DATA STRUCTURES & BINARY SEARCH TREES

1.1 Binary Search Tree (BST) Definition
A Binary Search Tree is a node-based binary tree data structure which has the following properties:
- The left subtree of a node contains only nodes with keys lesser than the node's key.
- The right subtree of a node contains only nodes with keys greater than the node's key.
- The left and right subtree each must also be a binary search tree.
- There must be no duplicate nodes (or duplicates handled systematically).

1.2 BST Operations and Time Complexity
- Search: To search for a given key, compare it with the root. If equal, search succeeds. If smaller, recurse left; if larger, recurse right.
- Insertion: Begins with a search; when a null link is reached, a new node containing the key is attached.
- Deletion: Three cases:
  1. Node to delete is a leaf (no children): Simply remove it.
  2. Node has one child: Replace node with its child.
  3. Node has two children: Find node's in-order successor (smallest in right subtree) or in-order predecessor, copy its value, and delete the successor.

Time Complexity:
- Average Case: O(log n) for search, insert, and delete when the tree is balanced.
- Worst Case: O(n) when the tree becomes skewed (degenerate tree resembling a linked list).
- Space Complexity: O(n) to store n elements.

1.3 Tree Traversals
- In-Order (Left, Root, Right): Traverses BST nodes in non-decreasing (sorted) order.
- Pre-Order (Root, Left, Right): Useful for creating a copy of the tree.
- Post-Order (Left, Right, Root): Useful for deleting the tree or bottom-up evaluations.""",

            """CHAPTER 2: ALGORITHM ANALYSIS & COMPLEXITY

2.1 Asymptotic Notations
Asymptotic notation describes the limiting behavior of an execution time or space requirement of an algorithm as the input size grows toward infinity.
- Big-O Notation (O): Upper bound / worst-case growth rate.
- Big-Omega Notation (Ω): Lower bound / best-case growth rate.
- Big-Theta Notation (Θ): Tight bound representing exact asymptotic growth rate.

2.2 Common Time Complexities
- O(1) Constant Time: Hash table lookup (average case), array index access.
- O(log n) Logarithmic Time: Binary Search, balanced BST operations (AVL / Red-Black trees).
- O(n) Linear Time: Linear search, traversing an array or linked list.
- O(n log n) Linearithmic Time: Merge Sort, Heap Sort, Quick Sort (average case).
- O(n^2) Quadratic Time: Bubble Sort, Selection Sort, Insertion Sort.
- O(2^n) Exponential Time: Recursive calculation of Fibonacci numbers, subset sum brute-force."""
        ]
    },
    {
        "filename": "Computer Networks and Protocols.pdf",
        "title": "Computer Networks: Architecture, OSI Model & TCP/IP Protocol Suite",
        "pages": [
            """CHAPTER 1: THE OSI 7-LAYER REFERENCE MODEL

1.1 Overview of OSI Architecture
The Open Systems Interconnection (OSI) model is a conceptual framework developed by the ISO that characterizes and standardizes the communication functions of a telecommunication or computing system.

The 7 Layers of OSI (from top to bottom):
Layer 7 - Application Layer: Provides network services directly to end-user applications (HTTP, HTTPS, FTP, SMTP, DNS).
Layer 6 - Presentation Layer: Handles syntax conversion, data formatting, encryption/decryption (SSL/TLS), and compression.
Layer 5 - Session Layer: Manages sessions, dialog control, and synchronization between applications (RPC, NetBIOS).
Layer 4 - Transport Layer: Provides end-to-end communication, segmentation, flow control, error recovery, and multiplexing (TCP, UDP).
Layer 3 - Network Layer: Responsible for logical addressing (IP addresses) and packet routing across multiple networks (IPv4, IPv6, ICMP, OSPF, BGP).
Layer 2 - Data Link Layer: Provides node-to-node data transfer, physical addressing (MAC addresses), error detection (CRC), and framing (Ethernet, Wi-Fi 802.11).
Layer 1 - Physical Layer: Transmits raw unstructured bitstreams over a physical transmission medium (cables, radio waves, optical fibers).""",

            """CHAPTER 2: THE TCP/IP PROTOCOL SUITE

2.1 Comparison of OSI and TCP/IP
The TCP/IP model is a 4-layer practical networking model:
1. Application Layer (Combines OSI Application, Presentation, Session)
2. Transport Layer (Corresponds to OSI Transport)
3. Internet Layer (Corresponds to OSI Network)
4. Network Access / Link Layer (Combines OSI Data Link and Physical)

2.2 Transmission Control Protocol (TCP)
TCP is a connection-oriented, reliable transport protocol that guarantees ordered delivery and integrity of data.
Key Mechanisms:
- Three-Way Handshake: SYN -> SYN-ACK -> ACK establishes a connection between client and server before data transfer begins.
- Connection Termination: Four-way handshake (FIN -> ACK -> FIN -> ACK).
- Flow Control: Implemented using a Sliding Window protocol to prevent sender from overwhelming receiver buffers.
- Congestion Control: Algorithms (Slow Start, Congestion Avoidance, Fast Retransmit, Fast Recovery) manage network pipeline traffic.

2.3 User Datagram Protocol (UDP)
UDP is a connectionless, lightweight transport protocol with minimal overhead. It does not provide acknowledgments, retransmission, or sequencing, making it ideal for real-time applications like video streaming, VoIP, and online gaming where speed is prioritized over reliability."""
        ]
    }
]

def create_and_ingest():
    print(f"Creating academic course PDFs in {PDF_DIR}...")
    for course in COURSES:
        pdf_path = os.path.join(PDF_DIR, course["filename"])
        doc = fitz.open()
        
        for i, page_text in enumerate(course["pages"]):
            page = doc.new_page(width=595, height=842) # A4 size
            # Title header on first page
            y_start = 50
            if i == 0:
                page.insert_text((50, y_start), course["title"], fontsize=14, fontname="helv", color=(0.1, 0.2, 0.6))
                page.draw_line(fitz.Point(50, y_start + 10), fitz.Point(545, y_start + 10), color=(0.2, 0.3, 0.7), width=1.5)
                y_start += 35
            
            # Content rect
            rect = fitz.Rect(50, y_start, 545, 790)
            page.insert_textbox(rect, page_text, fontsize=10, fontname="helv", lineheight=1.4, color=(0.1, 0.1, 0.1))
        
        doc.save(pdf_path)
        doc.close()
        print(f" Saved: {course['filename']}")
    
    print("\nRunning vectorstore ingestion pipeline...")
    count = ingest_documents(PDF_DIR)
    print(f" Ingestion complete! Total chunks in ChromaDB: {count}")

if __name__ == "__main__":
    create_and_ingest()
