export default function TermsPage() {
  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",maxWidth:680,margin:'0 auto',padding:'48px 24px 80px',color:'#1a1a2e'}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      <a href="/" style={{fontSize:13,color:'#1a2a5c',textDecoration:'none',fontWeight:600}}>← Back to Tuna Golf Pool</a>

      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,color:'#1a2a5c',marginTop:32,marginBottom:8}}>Terms of Service</h1>
      <p style={{color:'#6b7280',fontSize:13,marginBottom:40}}>Last updated: April 2026</p>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>1. What We Provide</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>Tuna Golf Pool ("the Service") is a software platform that allows groups of people to organize private golf prediction pools for major golf championships. We provide tools to create pools, submit picks, track live scores, and view standings.</p>
        <p style={{lineHeight:1.7,color:'#374151',marginTop:12}}>We are a technology platform only. We do not organize, host, or operate any gambling activity. We do not handle, hold, or distribute prize money between participants.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>2. Platform Fee</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>Access to the Service costs <strong>$10 per major championship</strong>. This fee covers one tournament for your pool — from entry opening through the final round.</p>
        <p style={{lineHeight:1.7,color:'#374151',marginTop:12}}>After each major ends, your pool automatically rotates to the next major and a new $10 fee is required to unlock entries for that tournament. Your pool URL, history, and past results are always preserved at no charge.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>3. No Refunds</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>All payments are <strong>non-refundable</strong> once your pool has been activated. By completing payment you acknowledge that access to the platform for the current major is immediately granted and no refund will be issued.</p>
        <p style={{lineHeight:1.7,color:'#374151',marginTop:12}}>If there is a technical issue on our end that prevents the platform from functioning, please contact us at <a href="mailto:support@tunagolfpool.com" style={{color:'#1a2a5c'}}>support@tunagolfpool.com</a> and we will work to resolve it.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>4. Your Responsibility for Local Laws</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>Laws regarding prediction pools, fantasy sports, and similar activities vary by location. <strong>You are solely responsible for ensuring your use of this platform complies with all applicable laws in your jurisdiction.</strong></p>
        <p style={{lineHeight:1.7,color:'#374151',marginTop:12}}>By using the Service you represent that you are legally permitted to participate in prediction pool activities in your location. Tuna Golf Pool makes no representations regarding the legality of use in any specific jurisdiction.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>5. Pool Commissioner Responsibility</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>The person who creates a pool ("Commissioner") is responsible for how that pool is run, including collecting and distributing any entry fees among participants. Tuna Golf Pool has no involvement in any money exchanged between pool participants.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>6. Data & Privacy</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>We store your pool name, commissioner name, email address, and picks in order to operate the Service. We do not sell your data to third parties. Your email is used only to send notifications about your pool.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>7. Disclaimer</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>The Service is provided "as is" without warranty of any kind. Live score data is sourced from DataGolf and may occasionally be delayed or unavailable. We are not responsible for any decisions made based on data displayed in the platform.</p>
      </section>

      <section style={{marginBottom:36}}>
        <h2 style={{fontSize:18,fontWeight:700,color:'#1a2a5c',marginBottom:12}}>8. Contact</h2>
        <p style={{lineHeight:1.7,color:'#374151'}}>Questions about these terms? Email us at <a href="mailto:support@tunagolfpool.com" style={{color:'#1a2a5c',fontWeight:600}}>support@tunagolfpool.com</a></p>
      </section>

      <div style={{borderTop:'1px solid #e5e7eb',paddingTop:24,marginTop:40}}>
        <p style={{fontSize:12,color:'#9ca3af'}}>By creating or joining a pool on Tuna Golf Pool you agree to these Terms of Service.</p>
      </div>
    </div>
  );
}
