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
import hashlib

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
# Raw Data tab (gid=697754726) - HubSpot export with deal data
RAW_DATA_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid=697754726"
# MQL/SQL data tab (gid=608527908)
SHEET_2_CSV_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid=608527908"

async def fetch_raw_data():
    """Fetch data from Raw Data tab (HubSpot export)"""
    import aiohttp
    import csv
    import io

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(RAW_DATA_CSV_URL, timeout=aiohttp.ClientTimeout(total=60)) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch raw data sheet: HTTP {response.status}")
                    return None

                content = await response.text()

                # Parse CSV
                csv_reader = csv.reader(io.StringIO(content))
                values = list(csv_reader)

                logger.info(f"Fetched {len(values)} rows from Raw Data tab")
                return values, content

    except Exception as e:
        logger.error(f"Error fetching raw data: {e}")
        return None, None

async def fetch_sheet_2_data():
    """Fetch data from Google Sheets second tab (MQL/SQL data)"""
    import aiohttp
    import csv
    import io
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(SHEET_2_CSV_URL, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch sheet 2: HTTP {response.status}")
                    return None
                
                content = await response.text()
                
                # Parse CSV
                csv_reader = csv.reader(io.StringIO(content))
                values = list(csv_reader)
                
                logger.info(f"Fetched {len(values)} rows from MQL/SQL sheet")
                return values
                
    except Exception as e:
        logger.error(f"Error fetching sheet 2 data: {e}")
        return None

def parse_raw_data(values: List[List[str]]) -> List[Dict]:
    """Parse Raw Data tab (HubSpot export) into deal objects"""
    if not values or len(values) < 2:
        return []

    headers = values[0]
    deals = []

    # Build header index map for efficient lookup
    header_idx = {h.strip(): i for i, h in enumerate(headers)}

    # Column mapping from HubSpot export to internal fields
    # Using column names from the Raw Data tab
    column_map = {
        'dealname': 'deal_name',
        'dealstage_name': 'stage',
        'Deal owner': 'ae',
        'geography': 'region',
        'Industry': 'industry',
        'Amount': 'amount',
        'Confidence': 'confidence',
        'Create Date': 'date',
        'Close Date': 'close_date',
        'Acquisition Channel': 'lead_source',
    }

    logger.info(f"Raw Data tab has {len(headers)} columns, {len(values)-1} data rows")

    for row_num, row in enumerate(values[1:], start=2):
        if not row or len(row) == 0:
            continue

        deal_data = {}

        # Extract fields using column mapping
        for col_name, field_name in column_map.items():
            idx = header_idx.get(col_name)
            if idx is not None and idx < len(row):
                value = row[idx].strip() if isinstance(row[idx], str) and row[idx] else ""

                # Parse numeric fields
                if field_name in ['amount', 'potential_size']:
                    try:
                        cleaned = str(value).replace('$', '').replace(',', '').replace('₹', '').replace('"', '').strip()
                        deal_data[field_name] = float(cleaned) if cleaned else 0.0
                    except:
                        deal_data[field_name] = 0.0
                else:
                    deal_data[field_name] = value

        # Use amount as potential_size if not separately available
        if 'potential_size' not in deal_data or deal_data.get('potential_size', 0) == 0:
            deal_data['potential_size'] = deal_data.get('amount', 0.0)

        # Skip rows without deal name or stage
        if not deal_data.get('deal_name') or not deal_data.get('stage'):
            continue

        # Skip rejected/archived deals if needed (optional - keeping all for now)
        stage = deal_data.get('stage', '').lower()
        if stage == 'reject':
            continue  # Skip rejected deals

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

    logger.info(f"Parsed {len(deals)} deals from Raw Data tab")
    return deals
            
def parse_mql_sql_data(values: List[List[str]]) -> Dict[str, Any]:
    """Parse MQL and SQL data from the sheet"""
    mql_sql_data = {
        'mql_us': {'channels': {}, 'dates': [], 'totals': []},
        'mql_india': {'channels': {}, 'dates': [], 'totals': []},
        'sql_us': {'channels': {}, 'dates': [], 'totals': []},
        'sql_india': {'channels': {}, 'dates': [], 'totals': []}
    }
    
    current_section = None
    header_row_index = None
    
    for i, row in enumerate(values):
        if not row or len(row) == 0:
            continue
        
        # Check for section markers in column F (index 5)
        if len(row) > 6:
            cell_6 = str(row[6]).strip() if row[6] else ""
            
            # Detect section headers
            if 'MQL - US' in cell_6:
                current_section = 'mql_us'
                header_row_index = None
                logger.info(f"Found MQL - US section at row {i}")
                continue
            elif 'MQL - India' in cell_6:
                current_section = 'mql_india'
                header_row_index = None
                logger.info(f"Found MQL - India section at row {i}")
                continue
            elif 'SQL - US' in cell_6:
                current_section = 'sql_us'
                header_row_index = None
                logger.info(f"Found SQL - US section at row {i}")
                continue
            elif 'SQL - India' in cell_6:
                current_section = 'sql_india'
                header_row_index = None
                logger.info(f"Found SQL - India section at row {i}")
                continue
        
        # If we're in a section, look for the header row with "Acquistion Channel"
        if current_section and header_row_index is None:
            first_cell = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            if first_cell == 'Acquistion Channel':
                # Extract dates from columns C-H (indices 2-7)
                dates = []
                for j in range(2, 8):
                    if len(row) > j and row[j]:
                        date_str = str(row[j]).strip()
                        if date_str and date_str != 'Weekly Target':
                            dates.append(date_str)
                
                mql_sql_data[current_section]['dates'] = dates
                header_row_index = i
                logger.info(f"Found header row for {current_section} at {i}, dates: {dates}")
                continue
        
        # Parse data rows after header
        if current_section and header_row_index is not None and i > header_row_index:
            channel_name = str(row[1]).strip() if len(row) > 1 and row[1] else ""
            
            # Stop at empty rows or new sections
            if not channel_name or (len(row) > 6 and row[6] and 'SQL' in str(row[6])):
                if channel_name == 'Total':
                    # Parse total row
                    totals = []
                    for j in range(2, 8):
                        if len(row) > j:
                            try:
                                val = int(row[j]) if row[j] and str(row[j]).strip() and str(row[j]).strip() not in ['', 'Weekly Target'] else 0
                                totals.append(val)
                            except:
                                totals.append(0)
                    mql_sql_data[current_section]['totals'] = totals
                    logger.info(f"Parsed totals for {current_section}: {totals}")
                
                # Reset for next section
                current_section = None
                header_row_index = None
                continue
            
            # Skip rows with #REF! or empty channel names
            if not channel_name or channel_name.startswith('#') or channel_name == 'Total':
                if channel_name == 'Total':
                    # Parse total row
                    totals = []
                    for j in range(2, 8):
                        if len(row) > j:
                            try:
                                val = int(row[j]) if row[j] and str(row[j]).strip() else 0
                                totals.append(val)
                            except:
                                totals.append(0)
                    mql_sql_data[current_section]['totals'] = totals
                    logger.info(f"Parsed totals for {current_section}: {totals}")
                continue
            
            # Parse channel data (columns C-H, indices 2-7)
            channel_values = []
            for j in range(2, 8):
                if len(row) > j:
                    try:
                        val = int(row[j]) if row[j] and str(row[j]).strip() else 0
                        channel_values.append(val)
                    except:
                        channel_values.append(0)
            
            # Only add if has some data
            if channel_values and sum(channel_values) > 0:
                mql_sql_data[current_section]['channels'][channel_name] = channel_values
                logger.info(f"Parsed {current_section} - {channel_name}: {channel_values}")
    
    logger.info(f"Final MQL/SQL data structure: {list(mql_sql_data.keys())}")
    for section, data in mql_sql_data.items():
        logger.info(f"{section}: {len(data['channels'])} channels, {len(data['dates'])} dates, totals: {data['totals']}")
    
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

def compute_content_hash(content: str) -> str:
    """Compute MD5 hash of content for change detection"""
    return hashlib.md5(content.encode('utf-8')).hexdigest()


@api_router.post("/sheets/sync")
async def sync_sheets():
    """Sync data from Google Sheets to MongoDB"""
    try:
        result = await fetch_raw_data()
        if result[0] is None:
            raise HTTPException(status_code=500, detail="Failed to fetch sheet data. Please ensure the Google Sheet is publicly accessible.")

        values, raw_content = result

        deals = parse_raw_data(values)

        if not deals:
            raise HTTPException(status_code=400, detail="No valid deal data found in the sheet")

        # Compute content hash for change detection
        content_hash = compute_content_hash(raw_content)

        # Clear existing deals and insert new ones
        await db.deals.delete_many({})

        # Convert deals to documents
        deal_docs = [{**deal, 'created_at': deal['created_at']} for deal in deals]
        await db.deals.insert_many(deal_docs)

        # Fetch and sync MQL/SQL data from the second sheet
        sheet_2_values = await fetch_sheet_2_data()
        if sheet_2_values:
            await sync_mql_sql_data(sheet_2_values)
        else:
            logger.warning("Could not fetch MQL/SQL data from second sheet")

        # Update sync metadata with content hash
        sync_meta = {
            'id': str(uuid.uuid4()),
            'last_sync': datetime.now(timezone.utc).isoformat(),
            'status': 'success',
            'records_synced': len(deals),
            'content_hash': content_hash,
            'error': None
        }

        await db.sync_metadata.delete_many({})
        await db.sync_metadata.insert_one(sync_meta)

        return {
            'status': 'success',
            'records_synced': len(deals),
            'last_sync': sync_meta['last_sync'],
            'content_hash': content_hash
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


@api_router.get("/sheets/check-changes")
async def check_sheet_changes():
    """Check if sheet data has changed since last sync"""
    import aiohttp

    try:
        # Get stored hash
        sync_meta = await db.sync_metadata.find_one({}, {'_id': 0})
        stored_hash = sync_meta.get('content_hash') if sync_meta else None

        # Fetch current sheet content
        async with aiohttp.ClientSession() as session:
            async with session.get(RAW_DATA_CSV_URL, timeout=aiohttp.ClientTimeout(total=30)) as response:
                if response.status != 200:
                    return {'has_changes': False, 'error': 'Failed to fetch sheet'}

                content = await response.text()
                current_hash = compute_content_hash(content)

        has_changes = stored_hash is None or stored_hash != current_hash

        return {
            'has_changes': has_changes,
            'current_hash': current_hash,
            'stored_hash': stored_hash
        }

    except Exception as e:
        logger.error(f"Error checking sheet changes: {e}")
        return {'has_changes': False, 'error': str(e)}


@api_router.post("/sheets/auto-sync")
async def auto_sync_if_changed():
    """Automatically sync if sheet data has changed"""
    try:
        # Check for changes first
        change_check = await check_sheet_changes()

        if change_check.get('error'):
            return {
                'synced': False,
                'reason': 'error_checking_changes',
                'error': change_check['error']
            }

        if not change_check.get('has_changes'):
            # No changes, return current status
            sync_meta = await db.sync_metadata.find_one({}, {'_id': 0})
            return {
                'synced': False,
                'reason': 'no_changes',
                'last_sync': sync_meta.get('last_sync') if sync_meta else None,
                'records_count': sync_meta.get('records_synced', 0) if sync_meta else 0
            }

        # Changes detected, perform sync
        sync_result = await sync_sheets()

        return {
            'synced': True,
            'reason': 'changes_detected',
            'records_synced': sync_result['records_synced'],
            'last_sync': sync_result['last_sync']
        }

    except Exception as e:
        logger.error(f"Auto-sync error: {e}")
        return {
            'synced': False,
            'reason': 'sync_error',
            'error': str(e)
        }

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

@api_router.get("/analytics/mql-sql")
async def get_mql_sql_metrics():
    """Get MQL and SQL metrics"""
    try:
        data = await db.mql_sql_metrics.find_one({}, {'_id': 0})
        
        if not data:
            return {
                'mql_us': {},
                'mql_india': {},
                'sql_us': {},
                'sql_india': {},
                'mql_total': {},
                'sql_total': {}
            }
        
        return data.get('data', {})
        
    except Exception as e:
        logger.error(f"Error fetching MQL/SQL metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/analytics/lead-funnel")
async def get_lead_funnel():
    """Get lead funnel conversion metrics"""
    try:
        # Get MQL/SQL data
        mql_sql_doc = await db.mql_sql_metrics.find_one({}, {'_id': 0})
        
        if not mql_sql_doc:
            return {
                'mql_india': 0,
                'sql_india': 0,
                'deals_india': 0,
                'mql_us': 0,
                'sql_us': 0,
                'deals_us': 0,
                'conversion_mql_to_sql_india': 0,
                'conversion_sql_to_deal_india': 0,
                'conversion_mql_to_sql_us': 0,
                'conversion_sql_to_deal_us': 0
            }
        
        mql_sql_data = mql_sql_doc.get('data', {})
        
        # Calculate totals for each region
        mql_india_total = sum(mql_sql_data.get('mql_india', {}).get('totals', []))
        sql_india_total = sum(mql_sql_data.get('sql_india', {}).get('totals', []))
        mql_us_total = sum(mql_sql_data.get('mql_us', {}).get('totals', []))
        sql_us_total = sum(mql_sql_data.get('sql_us', {}).get('totals', []))
        
        # Get deal counts by region
        deals = await db.deals.find({}, {'_id': 0}).to_list(10000)
        deals_india = len([d for d in deals if d.get('region', '').lower() == 'india'])
        deals_us = len([d for d in deals if d.get('region', '').lower() == 'us'])
        
        # Calculate conversion rates
        conv_mql_sql_india = (sql_india_total / mql_india_total * 100) if mql_india_total > 0 else 0
        conv_sql_deal_india = (deals_india / sql_india_total * 100) if sql_india_total > 0 else 0
        conv_mql_sql_us = (sql_us_total / mql_us_total * 100) if mql_us_total > 0 else 0
        conv_sql_deal_us = (deals_us / sql_us_total * 100) if sql_us_total > 0 else 0
        
        return {
            'mql_india': mql_india_total,
            'sql_india': sql_india_total,
            'deals_india': deals_india,
            'mql_us': mql_us_total,
            'sql_us': sql_us_total,
            'deals_us': deals_us,
            'conversion_mql_to_sql_india': round(conv_mql_sql_india, 1),
            'conversion_sql_to_deal_india': round(conv_sql_deal_india, 1),
            'conversion_mql_to_sql_us': round(conv_mql_sql_us, 1),
            'conversion_sql_to_deal_us': round(conv_sql_deal_us, 1),
            'overall_conversion_india': round((deals_india / mql_india_total * 100) if mql_india_total > 0 else 0, 1),
            'overall_conversion_us': round((deals_us / mql_us_total * 100) if mql_us_total > 0 else 0, 1)
        }
        
    except Exception as e:
        logger.error(f"Error calculating lead funnel: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/trends/ai-news")
async def get_ai_trends():
    """Get AI industry trends and news"""
    try:
        # In a production environment, integrate with a news API
        # For now, returning curated mock data relevant to AI and Nurix.ai
        trends = [
            {
                "title": "OpenAI Announces GPT-5 with Enhanced Reasoning Capabilities",
                "description": "OpenAI unveils GPT-5, featuring breakthrough improvements in logical reasoning and multi-step problem solving.",
                "url": "https://openai.com/research",
                "publishedAt": datetime.now(timezone.utc).isoformat(),
                "source": "TechCrunch",
                "category": "AI Models"
            },
            {
                "title": "AI Agents Transform Enterprise Workflows: $50B Market by 2026",
                "description": "Market research shows AI agent adoption accelerating across industries, with autonomous agents handling complex business processes.",
                "url": "https://www.gartner.com",
                "publishedAt": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
                "source": "Forbes",
                "category": "Market Trends"
            },
            {
                "title": "Enterprise AI Adoption Reaches 68% Among Fortune 500 Companies",
                "description": "Latest survey reveals rapid AI integration across large enterprises, with focus on productivity and automation tools.",
                "url": "https://www.mckinsey.com",
                "publishedAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
                "source": "McKinsey",
                "category": "Enterprise AI"
            },
            {
                "title": "AI-Powered Sales Platforms See 150% Growth in Q4 2024",
                "description": "Sales automation and AI-driven customer engagement platforms experience unprecedented growth, driven by demand for efficiency.",
                "url": "https://venturebeat.com",
                "publishedAt": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
                "source": "VentureBeat",
                "category": "Funding"
            },
            {
                "title": "Google's Gemini Ultra Achieves Human-Level Performance on Complex Tasks",
                "description": "Google's latest AI model demonstrates unprecedented accuracy in scientific reasoning and creative tasks.",
                "url": "https://deepmind.google",
                "publishedAt": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
                "source": "The Verge",
                "category": "AI Models"
            }
        ]
        
        return {"articles": trends, "count": len(trends)}
        
    except Exception as e:
        logger.error(f"Error fetching AI trends: {e}")
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