from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build
import asyncio
from functools import lru_cache

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    deal_name: str
    stage: str
    ae: str
    region: str
    industry: str
    amount: float
    potential_size: float
    confidence: str
    date: str
    close_date: Optional[str] = None
    lead_source: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SyncMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    last_sync: datetime
    status: str
    records_synced: int
    error: Optional[str] = None

class PipelineMetrics(BaseModel):
    total_deals: int
    total_value: float
    avg_deal_size: float
    win_rate: float
    stages: Dict[str, Any]

class AEPerformance(BaseModel):
    ae_name: str
    total_deals: int
    total_value: float
    won_deals: int
    avg_deal_size: float
    conversion_rate: float

class RegionalMetrics(BaseModel):
    region: str
    total_deals: int
    total_value: float
    avg_deal_size: float

class TrendData(BaseModel):
    date: str
    deals: int
    value: float

class MQLSQLMetrics(BaseModel):
    region: str
    date_columns: List[str]
    channels: Dict[str, List[int]]
    totals: List[int]
    weekly_target: Optional[int] = None
    monthly_target: Optional[int] = None

class LeadFunnelMetrics(BaseModel):
    mql_india: int
    sql_india: int
    deals_india: int
    mql_us: int
    sql_us: int
    deals_us: int
    conversion_mql_to_sql: float
    conversion_sql_to_deal: float

# Google Sheets Configuration - Using CSV export from publicly shared sheet
SPREADSHEET_ID = "1sCF9c4A0rartzBdJMo8bYQbKkAyHqcJsIZOlANDcbn4"
SHEET_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv"

async def fetch_sheet_data():
    """Fetch data from Google Sheets published CSV"""
    import aiohttp
    import csv
    import io
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(SHEET_CSV_URL, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch sheet: HTTP {response.status}")
                    return None
                
                content = await response.text()
                
                # Parse CSV
                csv_reader = csv.reader(io.StringIO(content))
                values = list(csv_reader)
                
                logger.info(f"Fetched {len(values)} rows from sheet")
                return values
                
    except Exception as e:
        logger.error(f"Error fetching sheet data: {e}")
        return None

def parse_sheet_data(values: List[List[str]]) -> List[Dict]:
    """Parse sheet data into deal objects"""
    if not values or len(values) < 2:
        return []
    
    headers = values[0]
    deals = []
    
    # Map headers to expected fields - matching actual Google Sheet columns
    header_map = {
        'Stage': 'stage',
        'Deal': 'deal_name',
        'AE': 'ae',
        'Geo': 'region',
        'Industry': 'industry',
        'Amount': 'amount',
        'Potential Deal Size': 'potential_size',
        'Confidence': 'confidence',
        'Date': 'date',
        'Project Status': 'project_status'
    }
    
    logger.info(f"Sheet headers: {headers}")
    
    for row in values[1:]:
        if not row or len(row) == 0:
            continue
        
        # Skip rows that don't have a deal name or stage
        if len(row) < 2 or not row[0] or not row[1]:
            continue
            
        deal_data = {}
        for i, header in enumerate(headers):
            if i < len(row) and header in header_map:
                field = header_map[header]
                value = row[i].strip() if isinstance(row[i], str) and row[i] else ""
                
                # Parse numeric fields
                if field in ['amount', 'potential_size']:
                    try:
                        # Remove currency symbols, commas, and other formatting
                        cleaned = str(value).replace('$', '').replace(',', '').replace('₹', '').replace('"', '')
                        deal_data[field] = float(cleaned) if cleaned else 0.0
                    except:
                        deal_data[field] = 0.0
                else:
                    deal_data[field] = value
        
        # Only add if required fields exist
        if deal_data.get('deal_name') and deal_data.get('stage'):
            # Set defaults for missing fields
            if not deal_data.get('ae'):
                deal_data['ae'] = 'Unknown'
            if not deal_data.get('region'):
                deal_data['region'] = 'Unknown'
            if not deal_data.get('industry'):
                deal_data['industry'] = 'Unknown'
            if not deal_data.get('confidence'):
                deal_data['confidence'] = 'Medium'
            if not deal_data.get('date'):
                deal_data['date'] = datetime.now().strftime('%Y-%m-%d')
                
            deal_data['id'] = str(uuid.uuid4())
            deal_data['created_at'] = datetime.now(timezone.utc).isoformat()
            deals.append(deal_data)
            
def parse_mql_sql_data(values: List[List[str]]) -> Dict[str, Any]:
    """Parse MQL and SQL data from the sheet"""
    mql_sql_data = {
        'mql_us': {'channels': {}, 'dates': [], 'totals': []},
        'mql_india': {'channels': {}, 'dates': [], 'totals': []},
        'sql_us': {'channels': {}, 'dates': [], 'totals': []},
        'sql_india': {'channels': {}, 'dates': [], 'totals': []},
        'mql_total': {'channels': {}, 'dates': [], 'totals': []},
        'sql_total': {'channels': {}, 'dates': [], 'totals': []}
    }
    
    current_section = None
    date_row = None
    
    for i, row in enumerate(values):
        if not row or len(row) == 0:
            continue
        
        # Detect section headers
        first_cell = str(row[0]).strip() if row[0] else ""
        
        # Check for MQL/SQL section markers
        if len(row) > 5 and isinstance(row[5], str):
            cell_5 = str(row[5]).strip()
            if 'MQL - US' in cell_5:
                current_section = 'mql_us'
                continue
            elif 'MQL - India' in cell_5:
                current_section = 'mql_india'
                continue
            elif 'SQL - US' in cell_5:
                current_section = 'sql_us'
                continue
            elif 'SQL - India' in cell_5:
                current_section = 'sql_india'
                continue
            elif cell_5 == 'MQL':
                current_section = 'mql_total'
                continue
            elif cell_5 == 'SQL':
                current_section = 'sql_total'
                continue
        
        # If we're in a section and this is the header row (has "Acquistion Channel")
        if current_section and first_cell == 'Acquistion Channel':
            # Extract date columns
            dates = []
            for j in range(2, min(8, len(row))):  # Columns C through H (8 Dec to 12 Jan)
                if row[j]:
                    dates.append(str(row[j]).strip())
            mql_sql_data[current_section]['dates'] = dates
            date_row = i
            continue
        
        # If we're in a section and have passed the header, parse data rows
        if current_section and date_row and i > date_row:
            channel = first_cell
            if channel and channel != 'Total' and not channel.startswith('#'):
                values_list = []
                for j in range(2, min(8, len(row))):
                    try:
                        val = int(row[j]) if row[j] and str(row[j]).strip() else 0
                        values_list.append(val)
                    except:
                        values_list.append(0)
                
                if values_list and sum(values_list) > 0:  # Only add if has data
                    mql_sql_data[current_section]['channels'][channel] = values_list
            
            # Capture total row
            if channel == 'Total':
                values_list = []
                for j in range(2, min(8, len(row))):
                    try:
                        val = int(row[j]) if row[j] and str(row[j]).strip() else 0
                        values_list.append(val)
                    except:
                        values_list.append(0)
                mql_sql_data[current_section]['totals'] = values_list
                current_section = None  # End of this section
    
    return mql_sql_data

async def sync_mql_sql_data(values: List[List[str]]):
    """Sync MQL/SQL data to database"""
    try:
        mql_sql_data = parse_mql_sql_data(values)
        
        # Store in database
        await db.mql_sql_metrics.delete_many({})
        
        doc = {
            'id': str(uuid.uuid4()),
            'data': mql_sql_data,
            'last_updated': datetime.now(timezone.utc).isoformat()
        }
        
        await db.mql_sql_metrics.insert_one(doc)
        logger.info("MQL/SQL data synced successfully")
        
    except Exception as e:
        logger.error(f"Error syncing MQL/SQL data: {e}")

@api_router.post("/sheets/sync")
async def sync_sheets():
    """Sync data from Google Sheets to MongoDB"""
    try:
        values = await fetch_sheet_data()
        
        if not values:
            raise HTTPException(status_code=500, detail="Failed to fetch sheet data. Please ensure the Google Sheet is publicly accessible or provide proper credentials.")
        
        deals = parse_sheet_data(values)
        
        if not deals:
            raise HTTPException(status_code=400, detail="No valid deal data found in the sheet")
        
        # Clear existing deals and insert new ones
        await db.deals.delete_many({})
        
        # Convert deals to documents
        deal_docs = [{**deal, 'created_at': deal['created_at']} for deal in deals]
        await db.deals.insert_many(deal_docs)
        
        # Update sync metadata
        sync_meta = {
            'id': str(uuid.uuid4()),
            'last_sync': datetime.now(timezone.utc).isoformat(),
            'status': 'success',
            'records_synced': len(deals),
            'error': None
        }
        
        await db.sync_metadata.delete_many({})
        await db.sync_metadata.insert_one(sync_meta)
        
        return {
            'status': 'success',
            'records_synced': len(deals),
            'last_sync': sync_meta['last_sync']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync error: {e}")
        
        # Log error in metadata
        sync_meta = {
            'id': str(uuid.uuid4()),
            'last_sync': datetime.now(timezone.utc).isoformat(),
            'status': 'error',
            'records_synced': 0,
            'error': str(e)
        }
        await db.sync_metadata.delete_many({})
        await db.sync_metadata.insert_one(sync_meta)
        
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@api_router.get("/deals")
async def get_deals(
    ae: Optional[str] = None,
    region: Optional[str] = None,
    stage: Optional[str] = None,
    industry: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """Get deals with optional filters"""
    try:
        query = {}
        
        if ae:
            query['ae'] = ae
        if region:
            query['region'] = region
        if stage:
            query['stage'] = stage
        if industry:
            query['industry'] = industry
        
        deals = await db.deals.find(query, {'_id': 0}).to_list(10000)
        
        return {'deals': deals, 'count': len(deals)}
        
    except Exception as e:
        logger.error(f"Error fetching deals: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/pipeline")
async def get_pipeline_metrics():
    """Get pipeline metrics"""
    try:
        deals = await db.deals.find({}, {'_id': 0}).to_list(10000)
        
        if not deals:
            return {
                'total_deals': 0,
                'total_value': 0,
                'avg_deal_size': 0,
                'win_rate': 0,
                'stages': {}
            }
        
        # Calculate metrics
        total_deals = len(deals)
        total_value = sum(deal.get('potential_size', 0) for deal in deals)
        avg_deal_size = total_value / total_deals if total_deals > 0 else 0
        
        # Win rate
        won_deals = len([d for d in deals if d.get('stage', '').lower() in ['deal won', 'closed won', 'won']])
        closed_deals = len([d for d in deals if d.get('stage', '').lower() in ['deal won', 'deal lost', 'closed won', 'closed lost', 'won', 'lost']])
        win_rate = (won_deals / closed_deals * 100) if closed_deals > 0 else 0
        
        # Stage breakdown
        stage_metrics = {}
        for deal in deals:
            stage = deal.get('stage', 'Unknown')
            if stage not in stage_metrics:
                stage_metrics[stage] = {'count': 0, 'value': 0}
            stage_metrics[stage]['count'] += 1
            stage_metrics[stage]['value'] += deal.get('potential_size', 0)
        
        return {
            'total_deals': total_deals,
            'total_value': round(total_value, 2),
            'avg_deal_size': round(avg_deal_size, 2),
            'win_rate': round(win_rate, 2),
            'stages': stage_metrics
        }
        
    except Exception as e:
        logger.error(f"Error calculating pipeline metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/ae-performance")
async def get_ae_performance():
    """Get AE performance metrics"""
    try:
        deals = await db.deals.find({}, {'_id': 0}).to_list(10000)
        
        ae_metrics = {}
        
        for deal in deals:
            ae = deal.get('ae', 'Unknown')
            if not ae:
                continue
                
            if ae not in ae_metrics:
                ae_metrics[ae] = {
                    'ae_name': ae,
                    'total_deals': 0,
                    'total_value': 0,
                    'won_deals': 0,
                    'total_closed': 0
                }
            
            ae_metrics[ae]['total_deals'] += 1
            ae_metrics[ae]['total_value'] += deal.get('potential_size', 0)
            
            stage = deal.get('stage', '').lower()
            if stage in ['deal won', 'closed won', 'won']:
                ae_metrics[ae]['won_deals'] += 1
                ae_metrics[ae]['total_closed'] += 1
            elif stage in ['deal lost', 'closed lost', 'lost']:
                ae_metrics[ae]['total_closed'] += 1
        
        # Calculate derived metrics
        for ae in ae_metrics:
            metrics = ae_metrics[ae]
            metrics['avg_deal_size'] = round(
                metrics['total_value'] / metrics['total_deals'] if metrics['total_deals'] > 0 else 0,
                2
            )
            metrics['conversion_rate'] = round(
                metrics['won_deals'] / metrics['total_closed'] * 100 if metrics['total_closed'] > 0 else 0,
                2
            )
            metrics['total_value'] = round(metrics['total_value'], 2)
        
        return {'ae_performance': list(ae_metrics.values())}
        
    except Exception as e:
        logger.error(f"Error calculating AE performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/regional")
async def get_regional_metrics():
    """Get regional breakdown"""
    try:
        deals = await db.deals.find({}, {'_id': 0}).to_list(10000)
        
        region_metrics = {}
        
        for deal in deals:
            region = deal.get('region', 'Unknown')
            if not region:
                continue
                
            if region not in region_metrics:
                region_metrics[region] = {
                    'region': region,
                    'total_deals': 0,
                    'total_value': 0
                }
            
            region_metrics[region]['total_deals'] += 1
            region_metrics[region]['total_value'] += deal.get('potential_size', 0)
        
        # Calculate avg deal size
        for region in region_metrics:
            metrics = region_metrics[region]
            metrics['avg_deal_size'] = round(
                metrics['total_value'] / metrics['total_deals'] if metrics['total_deals'] > 0 else 0,
                2
            )
            metrics['total_value'] = round(metrics['total_value'], 2)
        
        return {'regional_metrics': list(region_metrics.values())}
        
    except Exception as e:
        logger.error(f"Error calculating regional metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/filters")
async def get_filter_options():
    """Get available filter options"""
    try:
        deals = await db.deals.find({}, {'_id': 0}).to_list(10000)
        
        aes = sorted(list(set(deal.get('ae', '') for deal in deals if deal.get('ae'))))
        regions = sorted(list(set(deal.get('region', '') for deal in deals if deal.get('region'))))
        stages = sorted(list(set(deal.get('stage', '') for deal in deals if deal.get('stage'))))
        industries = sorted(list(set(deal.get('industry', '') for deal in deals if deal.get('industry'))))
        
        return {
            'aes': aes,
            'regions': regions,
            'stages': stages,
            'industries': industries
        }
        
    except Exception as e:
        logger.error(f"Error fetching filter options: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/sync-status")
async def get_sync_status():
    """Get last sync status"""
    try:
        sync = await db.sync_metadata.find_one({}, {'_id': 0}, sort=[('last_sync', -1)])
        
        if not sync:
            return {
                'status': 'never_synced',
                'last_sync': None,
                'records_synced': 0
            }
        
        return sync
        
    except Exception as e:
        logger.error(f"Error fetching sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/")
async def root():
    return {"message": "Lead Pipeline Dashboard API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()