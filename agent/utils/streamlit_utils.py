"""
Streamlit display utilities for ShopGenie application.
"""
import streamlit as st
from typing import List, Dict, Any

def display_product_comparisons(comparisons: List[Dict], best_product: Dict, youtube_link: str = None):
    """
    Display product comparisons in an attractive Streamlit format.
    
    Args:
        comparisons: List of product comparison data
        best_product: Information about the best product
        youtube_link: Optional YouTube link for additional information
    """
    st.title("Your Best Product Match")
    
    best_product_card_html = f"""
    <div style="padding: 20px; border-radius: 10px; background-color: #f0f9ff; border: 2px solid #0096c7; margin-bottom: 20px;">
        <h2 style="color: #0077b6;">{best_product.get('product_name', 'Recommended Product')}</h2>
        <p style="font-style: italic; color: #023e8a; font-size: 1.1em;">{best_product.get('justification', '')}</p>
    </div>
    """
    st.markdown(best_product_card_html, unsafe_allow_html=True)
    
    # YouTube video (if available)
    if youtube_link and 'youtube.com' in youtube_link:
        st.subheader("Watch Review Video")
        st.video(youtube_link)
    
    # Product Comparison Table
    st.header("Product Comparison")
    
    # Create tabs for different comparison views
    tab1, tab2, tab3 = st.tabs(["Specifications", "Ratings", "Reviews"])
    
    # Add content to each tab
    with tab1:
        st.subheader("Technical Specifications")
        specs_data = []
        specs_columns = ["Product", "Processor", "Battery", "Camera", "Display", "Storage"]
        
        for product in comparisons:
            product_name = product.get('product_name', 'Unknown')
            specs = product.get('specs_comparison', {})
            specs_data.append([
                product_name,
                specs.get('processor', '-'),
                specs.get('battery', '-'),
                specs.get('camera', '-'),
                specs.get('display', '-'),
                specs.get('storage', '-')
            ])
        
        st.table(pd.DataFrame(specs_data, columns=specs_columns))
    
    with tab2:
        st.subheader("Performance Ratings")
        
        # Prepare data for radar chart
        categories = ['Overall', 'Performance', 'Battery', 'Camera', 'Display']
        fig = go.Figure()
        
        for product in comparisons:
            product_name = product.get('product_name', 'Unknown')
            ratings = product.get('ratings_comparison', {})
            
            values = [
                ratings.get('overall_rating', 0),
                ratings.get('performance', 0),
                ratings.get('battery_life', 0),
                ratings.get('camera_quality', 0),
                ratings.get('display_quality', 0)
            ]
            
            # Close the polygon by appending the first value
            values.append(values[0])
            categories_closed = categories + [categories[0]]
            
            fig.add_trace(go.Scatterpolar(
                r=values,
                theta=categories_closed,
                fill='toself',
                name=product_name
            ))
        
        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 5]
                )
            ),
            showlegend=True
        )
        
        st.plotly_chart(fig)
        
        # Display ratings as a table as well
        ratings_data = []
        ratings_columns = ["Product", "Overall", "Performance", "Battery Life", "Camera Quality", "Display Quality"]
        
        for product in comparisons:
            product_name = product.get('product_name', 'Unknown')
            ratings = product.get('ratings_comparison', {})
            ratings_data.append([
                product_name,
                ratings.get('overall_rating', '-'),
                ratings.get('performance', '-'),
                ratings.get('battery_life', '-'),
                ratings.get('camera_quality', '-'),
                ratings.get('display_quality', '-')
            ])
        
        st.table(pd.DataFrame(ratings_data, columns=ratings_columns))
    
    with tab3:
        st.subheader("Review Summaries")
        
        for product in comparisons:
            product_name = product.get('product_name', 'Unknown')
            reviews_summary = product.get('reviews_summary', 'No review information available.')
            
            st.markdown(f"### {product_name}")
            st.write(reviews_summary)
            st.markdown("---")

def display_streamlit_app(data: Dict[str, Any]):
    """
    Main function to display the complete ShopGenie app in Streamlit.
    
    Args:
        data: The data containing product comparisons and recommendations
    """
    try:
        # Import required libraries inside function to avoid global import issues
        import pandas as pd
        import plotly.graph_objects as go
        import streamlit as st
        
        # Set page configuration
        st.set_page_config(
            page_title="ShopGenie Product Recommendation", 
            page_icon="🧞", 
            layout="wide"
        )
        
        # Header with styling
        st.markdown("""
        <style>
        .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(90deg, #00B4D8, #0077B6);
            color: white;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        </style>
        <div class="header">
            <h1>ShopGenie</h1>
            <p>Your AI Shopping Assistant</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Extract data
        comparisons = data.get("comparison", [])
        best_product = data.get("best_product", {})
        youtube_link = data.get("youtube_link", "")
        
        # Main display function
        display_product_comparisons(comparisons, best_product, youtube_link)
        
        # Footer
        st.markdown("---")
        st.markdown("Powered by ShopGenie AI 🧞 - Your intelligent shopping assistant")
        
    except Exception as e:
        st.error(f"An error occurred while displaying the Streamlit app: {str(e)}")
        st.write("Please check the console for more details.")