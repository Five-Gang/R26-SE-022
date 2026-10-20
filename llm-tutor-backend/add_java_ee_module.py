"""
Script to create the 'Introduction to Java EE and Enterprise Applications' PDF
from lecture slides and ingest it into the AuraLearn ChromaDB vector store.
"""
import os
import fitz  # PyMuPDF
from ingestion.ingest_pipeline import ingest_documents

PDF_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "pdfs")
os.makedirs(PDF_DIR, exist_ok=True)

JAVA_EE_LECTURE = {
    "filename": "Introduction to Java EE and Enterprise Applications.pdf",
    "title": "Enterprise Application Development: Introduction to Java EE & Enterprise Applications",
    "pages": [
        """CHAPTER 1: INTRODUCTION TO ENTERPRISE APPLICATIONS
1.1 Overview & Characteristics
Enterprise applications are software systems designed to solve problems encountered by large enterprises (corporations, governments, and distributed organizations).
Key Pillars of Enterprise Applications:
- Large-scale: Handles millions of transactions, multi-user, multi-developer, multi-machine, multi-component.
- Scalable: Elastic capacity to adapt to growing computational and data demands.
- Reliable: Fault-tolerant, self-healing, providing continuous high-availability operation.
- Secure: Comprehensive authentication, authorization, data encryption, and role-based access control.

1.2 Core Enterprise Requirements
- Large: Manipulate massive amounts of data and utilize extensive parallel processing, network distributed resources, and complex logic across heterogeneous platforms.
- Business Oriented: Encodes specific business policies, workflows, business rules, and domain entities responsive to organizational needs.
- Mission Critical: Robust enough to sustain uninterrupted operation (24/7/365) with efficient maintenance, monitoring, failover, and administration.""",

        """CHAPTER 2: SCALABILITY & N-TIER ARCHITECTURE
2.1 Understanding Scalability
Scalability refers to the capacity of a software system to adapt its throughput and resources to handle increased workload.
- Vertical Scalability (Scale Up): Adding resources (CPU, RAM, SSD, Network bandwidth) within the same logical unit/server. Simple to implement but bound by hardware cost and physical limits.
- Horizontal Scalability (Scale Out): Adding multiple logical nodes/servers and making them work as a single unified cluster (distributed systems, load balancing). Virtually limitless scalability.

2.2 N-Tier / Multi-Tier Architecture
In an N-tier architecture, application processing, data management, and presentation functions are physically and logically segregated across distinct layers:
1. Presentation Tier (Client Tier): Web browsers, desktop apps, mobile devices. Responsible for rendering the UI and translating user interactions.
2. Logic Tier (Middle / Business Tier): Hosted on application servers. Coordinates application processes, executes business rules, enforces workflows, and processes commands.
3. Data Tier: Persistent data storage including Relational Databases (RDBMS), NoSQL, legacy systems, and storage area networks.

Benefits of N-Tier Architecture:
- Secure: Each tier is isolated and can be secured independently with tailored firewalls and security policies.
- Easy to Manage: Tiers can be modified, updated, or refactored independently without breaking adjacent layers.
- Scalable: Specific bottlenecks (e.g., business logic or database) can be scaled horizontally without affecting other tiers.
- Flexible: Enables technology diversity and independent deployment pipelines.""",

        """CHAPTER 3: THE JAVA EE & JAKARTA EE PLATFORMS
3.1 The Four Java Platforms
The Java programming language ecosystem consists of four standard platforms:
1. Java SE (Standard Edition): Core language, fundamental types, I/O, networking, security, GUI (Swing), database access (JDBC), XML processing.
2. Java EE (Enterprise Edition): Built on top of Java SE. Provides enterprise APIs, runtime containers, and deployment models for multi-tiered, large-scale, scalable network applications.
3. Java ME (Micro Edition): Targeted for constrained devices, microcontrollers, and embedded systems.
4. JavaFX: Rich client platform for creating cross-device desktop and media applications.

3.2 Evolution to Jakarta EE
- In September 2019, after 20 years, Java EE was transitioned from Oracle to the open-source Eclipse Foundation under the Eclipse Enterprise for Java (EE4J) initiative.
- Rebranded as Jakarta EE due to Oracle's trademark rights over the 'Java' brand name.
- Jakarta EE introduces open-source governance, high cloud-native focus, microprofile alignment, while remaining backward-compatible with Java EE 8.""",

        """CHAPTER 4: ENTERPRISE JAVA BEANS (EJB)
4.1 EJB Overview
An Enterprise Java Bean (EJB) is a server-side managed component that encapsulates the business logic of an enterprise application.
- It performs core computation and workflow tasks without handling UI presentation or direct database protocol manipulation.
- EJB Containers manage the bean lifecycle, transaction boundaries, thread pooling, and security context.

4.2 Types of EJBs: Session Beans
Session Beans represent business workflows and are callable by local, remote (RMI), or web service clients:
1. Stateless Session Beans (@Stateless):
   - Does NOT maintain conversational state for any particular client between method invocations.
   - Beans are pooled by the EJB container to service arbitrary incoming client requests on demand.
   - Lifecycle: Does Not Exist -> Dependency Injection -> @PostConstruct -> Ready -> @PreDestroy -> Does Not Exist.
2. Stateful Session Beans (@Stateful):
   - Maintains conversational client state across multiple sequential requests (e.g., shopping cart, multi-step checkout wizard).
   - Dedicated instance per client; terminates when the client session ends (ejbRemove).
3. Singleton Session Beans (@Singleton):
   - Exactly one instance is instantiated per entire application, shared concurrently across multiple client requests.

4.3 Message-Driven Beans (MDBs)
- MDBs (@MessageDriven) act as asynchronous JMS message listeners.
- Decouples producer from consumer: processes incoming messages asynchronously without blocking client threads.""",

        """CHAPTER 5: ASYNCHRONOUS MESSAGING & JMS
5.1 Java Message Service (JMS)
JMS is a standardized Java API providing loosely-coupled, reliable, asynchronous messaging between distributed enterprise components.
Advantages:
- Asynchronous: Clients dispatch requests without waiting for immediate execution.
- Reliable: Guarantees delivery even if consumer is temporarily offline.

5.2 Messaging Domains in JMS:
1. Point-to-Point (PTP) Domain:
   - Built around Queues.
   - Each message is delivered to exactly one receiver (1-to-1).
   - Sender and receiver operate with zero timing dependency; message resides in queue until consumed and acknowledged.
2. Publish/Subscribe (Pub/Sub) Domain:
   - Built around Topics.
   - Messages are broadcast to all active subscribers (1-to-many).
   - Timing dependency exists unless durable subscriptions are established.

5.3 JMS Programming Model Components:
- ConnectionFactory: Administered object used by clients to establish connection to the message broker.
- JMS Destination: Identifies target queue or topic.
- JMS Session: Single-threaded context for producing and consuming messages.
- MessageListener: Interface providing onMessage(Message msg) event-driven callback for asynchronous ingestion.""",

        """CHAPTER 6: REST ARCHITECTURE & JAX-RS
6.1 RESTful Web Services Principles
REpresentational State Transfer (REST) is an architectural style utilizing stateless HTTP communication for scalable web services:
- Uses standard HTTP verbs (GET, POST, PUT, DELETE).
- Stateless interactions: every client request encapsulates all necessary context.
- Supports lightweight data serialization formats (JSON, XML).

6.2 Java API for RESTful Web Services (JAX-RS)
JAX-RS simplifies REST development via declarative annotations:
- @Path("/api/resource"): Specifies relative URI path of the resource class or method.
- @GET: Handles HTTP GET operations for retrieving resources.
- @POST: Handles HTTP POST operations for creating resources.
- @PUT: Handles HTTP PUT operations for updating existing resources.
- @Produces("application/json"): Defines MIME response media types.
- @Consumes("application/x-www-form-urlencoded"): Defines accepted request body media types.
- Parameter Binding:
  * @PathParam("id"): Extracts variable from URI template.
  * @QueryParam("filter"): Extracts query string parameter from URL.
  * @FormParam("username"): Binds HTML form input values.
  * @DefaultValue("10"): Provides fallback when parameter is omitted.""",

        """CHAPTER 7: CORE JAVA EE APIS & ENTERPRISE INTEGRATION
7.1 Essential Java EE APIs
- JNDI (Java Naming and Directory Interface): Unified API for portable directory lookup (finding DataSource, EJB references, and JMS ConnectionFactories via symbolic names).
- Servlets: Java objects extending HTTP servers for dynamic request processing and response generation.
- JSP (JavaServer Pages): Separates visual presentation from backend business logic.
- JDBC (Java Database Connectivity): Relational database query and transaction abstraction.
- JTA (Java Transaction API): Coordinates distributed transactions across multiple XA resources (two-phase commit).
- JAXP: Validates and parses XML documents (DOM, SAX, StAX).
- JAAS: User-centric security, authentication, and authorization framework.
- JCA (Java EE Connector Architecture): Standard architecture for integrating legacy Enterprise Information Systems (EIS) and ERPs.
- JavaMail: Sends and receives emails via SMTP, POP3, and IMAP.

7.2 Enterprise Application Integration (EAI)
EAI integrates disparate departmental systems, third-party software, and legacy systems into cohesive workflows:
- Common Types: Information Portals, Data Replication, Shared Business Functions, Service-Oriented Architecture (SOA), B2B Integration.
- Basic Architecture: Endpoints -> Messages -> Channel -> Routing & Translation -> Target Application."""
    ]
}

def generate_and_ingest():
    pdf_path = os.path.join(PDF_DIR, JAVA_EE_LECTURE["filename"])
    print(f"Generating academic PDF at: {pdf_path}")
    
    doc = fitz.open()
    for i, page_text in enumerate(JAVA_EE_LECTURE["pages"]):
        page = doc.new_page(width=595, height=842) # A4 format
        y_start = 50
        
        # Header on every page
        page.insert_text((50, y_start), JAVA_EE_LECTURE["title"], fontsize=12, fontname="helv", color=(0.1, 0.2, 0.6))
        page.draw_line(fitz.Point(50, y_start + 10), fitz.Point(545, y_start + 10), color=(0.2, 0.3, 0.7), width=1.5)
        y_start += 35
        
        # Body text
        rect = fitz.Rect(50, y_start, 545, 790)
        page.insert_textbox(rect, page_text, fontsize=10, fontname="helv", lineheight=1.35, color=(0.1, 0.1, 0.1))
        
        # Footer
        page.insert_text((50, 810), f"AuraLearn Academic Materials · Slide {i+1} of {len(JAVA_EE_LECTURE['pages'])}", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(pdf_path)
    doc.close()
    print(f" Successfully saved PDF: {JAVA_EE_LECTURE['filename']}")
    
    print("\nRunning vectorstore ingestion pipeline...")
    count = ingest_documents(PDF_DIR)
    print(f" Ingestion complete! Total chunks now indexed in ChromaDB: {count}")

if __name__ == "__main__":
    generate_and_ingest()
